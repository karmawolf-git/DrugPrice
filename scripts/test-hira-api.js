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

// ── msInsItemPriceInfoService (현재 사용 중인 서비스)
const CURRENT = `${BASE_HIRA}/msInsItemPriceInfoService/getMsInsItemPriceInfo`

// ── 약가기준정보조회서비스 (15054445) 엔드포인트 후보
const CANDIDATES = [
  `${BASE_HIRA}/insItemPriceInfoService/getInsItemPriceInfo`,
  `${BASE_HIRA}/DrugPrcStdInfoService/getDrugPrcStdInfo`,
  `${BASE_HIRA}/drugPrcStdInfoService/getDrugPrcStdInfo`,
  `${BASE_HIRA}/InsHealthDrugPrcInfoService/getInsHealthDrugPrcInfo`,
  `${BASE_HIRA}/insHealthDrugPrcInfoService/getInsHealthDrugPrcInfo`,
  `${BASE_HIRA}/insItemPrcInfoService/getInsItemPrcInfo`,
  `${BASE_HIRA}/DrugPrcInfoService/getDrugPrcInfo`,
]

async function main() {
  console.log('=== HIRA API 연결 테스트 ===\n')
  console.log(`서비스키 앞 8자리: ${KEY.slice(0, 8)}...`)
  console.log(`서비스키 형식: ${/[%+/=]/.test(KEY) ? 'URL인코딩 포함' : '순수 hex/alphanumeric'}\n`)

  let passed = 0, failed = 0

  // ── 1. 현재 서비스 — serviceKey 인코딩 없이 전송 (수정된 방식)
  console.log('■ msInsItemPriceInfoService (현재 서비스, 인코딩 수정)')
  process.stdout.write('  노바스크 5mg (EDI: 073400360)... ')
  const r1 = await get(CURRENT, { serviceKey: KEY, type: 'json', numOfRows: '1', ediCode: '073400360' })
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

  // ── 2. 현재 서비스 — 인코딩 포함 버전도 테스트 (비교용)
  process.stdout.write('  노바스크 5mg (인코딩 포함 버전)... ')
  const encKey = encodeURIComponent(KEY)
  const qs2 = `serviceKey=${encKey}&type=json&numOfRows=1&ediCode=073400360`
  const r2 = await new Promise((resolve) => {
    const req = https.get(`${CURRENT}?${qs2}`, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let body = ''
      res.on('data', c => body += c)
      res.on('end', () => {
        try { resolve({ status: res.statusCode, json: JSON.parse(body), raw: body }) }
        catch { resolve({ status: res.statusCode, json: null, raw: body }) }
      })
    })
    req.on('error', e => resolve({ status: 0, json: null, raw: e.message }))
    req.setTimeout(10000, () => { req.destroy(); resolve({ status: 0, json: null, raw: 'timeout' }) })
  })
  if (r2.status === 200 && getBody(r2.json)?.totalCount > 0) {
    console.log(`✅ HTTP 200 (인코딩 버전도 성공)`)
  } else {
    console.log(`❌ HTTP ${r2.status} — ${r2.raw?.slice(0, 100)}`)
  }

  // ── 3. 약가기준정보조회서비스 엔드포인트 탐색
  console.log('\n■ 약가기준정보조회서비스 (15054445) 엔드포인트 탐색')
  for (const url of CANDIDATES) {
    const name = url.split('/').slice(-2).join('/')
    process.stdout.write(`  ${name}... `)
    const r = await get(url, { serviceKey: KEY, type: 'json', numOfRows: '1', pageNo: '1' })
    if (r.status === 200 && getBody(r.json)?.items) {
      console.log(`✅ HTTP 200 — 데이터 있음!`)
      const item = getBody(r.json)?.items?.item
      const p = Array.isArray(item) ? item[0] : item
      console.log('   응답 필드:', Object.keys(p || {}).join(', '))
      passed++
    } else if (r.status === 200) {
      console.log(`⚠️  HTTP 200 — 빈 결과 또는 에러: ${r.raw?.slice(0, 100)}`)
    } else if (r.status === 404) {
      console.log(`   HTTP 404 — 존재하지 않는 서비스명`)
    } else {
      console.log(`   HTTP ${r.status} — ${r.raw?.slice(0, 100)}`)
    }
  }

  console.log(`\n${'─'.repeat(50)}`)
  console.log(`결과: ${passed}개 통과, ${failed}개 실패 (현재 서비스 기준)`)
}

main().catch(e => { console.error(e); process.exit(1) })
