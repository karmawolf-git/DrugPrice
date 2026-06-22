#!/usr/bin/env node
/**
 * HIRA API 연결 테스트 + 약가기준정보조회서비스 엔드포인트 탐색
 * 실행: DATA_GO_KR_KEY=YOUR_KEY node scripts/test-hira-api.js
 */

import https from 'https'

const KEY = process.env.DATA_GO_KR_KEY || process.argv[2]
if (!KEY) {
  console.error('사용법: DATA_GO_KR_KEY=YOUR_KEY node scripts/test-hira-api.js')
  process.exit(1)
}

// serviceKey는 data.go.kr에서 이미 URL인코딩된 형식으로 발급 → 추가 인코딩 금지
function buildQs(params) {
  return Object.entries(params)
    .map(([k, v]) => k === 'serviceKey' ? `${k}=${v}` : `${k}=${encodeURIComponent(v)}`)
    .join('&')
}

function get(baseUrl, params) {
  const url = `${baseUrl}?${buildQs(params)}`
  return new Promise((resolve) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let body = ''
      res.on('data', c => body += c)
      res.on('end', () => {
        try { resolve({ status: res.statusCode, json: JSON.parse(body), raw: body }) }
        catch { resolve({ status: res.statusCode, json: null, raw: body }) }
      })
    })
    req.on('error', e => resolve({ status: 0, json: null, raw: e.message }))
    req.setTimeout(15000, () => { req.destroy(); resolve({ status: 0, json: null, raw: 'timeout' }) })
  })
}

function getBody(json) {
  return json?.response?.body ?? json?.body
}

const BASE_HIRA = 'https://apis.data.go.kr/B551182'

// ── msInsItemPriceInfoService (이전 서비스 — 키 미등록)
const OLD_SERVICE = `${BASE_HIRA}/msInsItemPriceInfoService/getMsInsItemPriceInfo`

// ── 약가기준정보조회서비스 (15054445) — getDgamtList 오퍼레이션
const DGAMT_BASE = `${BASE_HIRA}/dgamtCrtrInfoService1.2`
const DGAMT_URL = `${DGAMT_BASE}/getDgamtList`

async function main() {
  console.log('=== HIRA API 연결 테스트 ===\n')
  console.log(`서비스키 앞 8자리: ${KEY.slice(0, 8)}...`)
  console.log(`서비스키 형식: ${/[%+/=]/.test(KEY) ? 'URL인코딩 포함' : '순수 hex/alphanumeric'}\n`)

  let passed = 0, failed = 0

  // ── 1. 이전 서비스 확인 (msInsItemPriceInfoService — 키 미등록 예상)
  console.log('■ msInsItemPriceInfoService (이전 서비스, 키 미등록 예상)')
  process.stdout.write('  노바스크 5mg (EDI: 073400360)... ')
  const r1 = await get(OLD_SERVICE, { serviceKey: KEY, type: 'json', numOfRows: '1', ediCode: '073400360' })
  if (r1.status === 200 && getBody(r1.json)?.totalCount > 0) {
    const item = getBody(r1.json)?.items?.item
    const p = Array.isArray(item) ? item[0] : item
    console.log(`✅ HTTP 200 — ${p?.itemName ?? p?.ITEM_NAME} = ${p?.maximumPrice ?? p?.MAXIMUM_PRICE}원`)
    console.log('   응답 필드:', Object.keys(p || {}).join(', '))
    passed++
  } else {
    console.log(`❌ HTTP ${r1.status} — ${r1.raw?.slice(0, 200)}`)
    failed++
  }

  // ── 2. dgamtCrtrInfoService1.2 / getDgamtList — 파라미터 조합 탐색
  console.log('\n■ dgamtCrtrInfoService1.2/getDgamtList 파라미터 탐색')

  const paramSets = [
    { label: 'ediCode (EDI)', params: { serviceKey: KEY, type: 'json', numOfRows: '1', pageNo: '1', ediCode: '073400360' } },
    { label: 'ediCode (EDI) no type', params: { serviceKey: KEY, numOfRows: '1', pageNo: '1', ediCode: '073400360' } },
    { label: 'ingrCode (성분코드)', params: { serviceKey: KEY, type: 'json', numOfRows: '1', pageNo: '1', ingrCode: '107601ATB' } },
    { label: 'itemName (제품명)', params: { serviceKey: KEY, type: 'json', numOfRows: '3', pageNo: '1', itemName: '노바스크' } },
    { label: 'itemName (영문)', params: { serviceKey: KEY, type: 'json', numOfRows: '3', pageNo: '1', itemName: 'Norvasc' } },
    { label: '파라미터 없음 (첫 페이지)', params: { serviceKey: KEY, type: 'json', numOfRows: '3', pageNo: '1' } },
  ]

  for (const { label, params } of paramSets) {
    process.stdout.write(`  [${label}]... `)
    const r = await get(DGAMT_URL, params)
    if (r.status === 200 && getBody(r.json)?.items) {
      const item = getBody(r.json)?.items?.item
      const p = Array.isArray(item) ? item[0] : item
      const total = getBody(r.json)?.totalCount
      console.log(`✅ HTTP 200 — totalCount=${total}, 필드: ${Object.keys(p || {}).join(', ')}`)
      passed++
    } else if (r.status === 200) {
      const body = getBody(r.json)
      console.log(`⚠️  HTTP 200 — totalCount=${body?.totalCount ?? '?'}, 응답: ${r.raw?.slice(0, 150)}`)
    } else {
      console.log(`❌ HTTP ${r.status} — ${r.raw?.slice(0, 150)}`)
      if (r.status !== 200) failed++
    }
  }

  console.log(`\n${'─'.repeat(50)}`)
  console.log(`결과: ${passed}개 통과, ${failed}개 실패`)
}

main().catch(e => { console.error(e); process.exit(1) })
