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

// Simple regex-based XML → object (handles HIRA's flat item structure)
function parseXmlItem(xml) {
  const items = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let m
  while ((m = itemRegex.exec(xml)) !== null) {
    const fieldRegex = /<(\w+)>([^<]*)<\/\1>/g
    const obj = {}
    let f
    while ((f = fieldRegex.exec(m[1])) !== null) {
      obj[f[1]] = f[2]
    }
    items.push(obj)
  }
  return items
}

function extractXmlValue(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}>([^<]*)<\\/${tag}>`))
  return m ? m[1] : null
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

  // ── 2. dgamtCrtrInfoService1.2 / getDgamtList — 파라미터명 전수 탐색
  console.log('\n■ dgamtCrtrInfoService1.2/getDgamtList 파라미터명 탐색')

  // EDI 코드 073400360 (노바스크 5mg) 을 다양한 파라미터명으로 시도
  const EDI = '073400360'
  const ediParamNames = ['ediCode', 'ediCd', 'itemCode', 'itemCd', 'itemSeq', 'itmSeq', 'drugCode', 'drugCd', 'clCode', 'clCd']
  console.log('  [EDI코드 파라미터명 탐색]')
  for (const pName of ediParamNames) {
    process.stdout.write(`    ${pName}=073400360... `)
    const r = await get(DGAMT_URL, { serviceKey: KEY, numOfRows: '1', pageNo: '1', [pName]: EDI })
    const tc = r.status === 200 ? extractXmlValue(r.raw, 'totalCount') : null
    const items = r.status === 200 ? parseXmlItem(r.raw) : []
    if (items.length > 0) {
      console.log(`✅ totalCount=${tc}, 필드: ${Object.keys(items[0]).join(', ')}`)
      console.log('   값:', JSON.stringify(items[0]))
      passed++
    } else {
      console.log(`totalCount=${tc ?? r.status}`)
    }
  }

  // 성분코드 107601ATB (암로디핀 5mg) 를 다양한 파라미터명으로 시도
  const ING = '107601ATB'
  const ingParamNames = ['ingrCode', 'ingrCd', 'ingdCd', 'compCode', 'compCd', 'insrCode', 'insrCd']
  console.log('\n  [성분코드 파라미터명 탐색]')
  for (const pName of ingParamNames) {
    process.stdout.write(`    ${pName}=107601ATB... `)
    const r = await get(DGAMT_URL, { serviceKey: KEY, numOfRows: '1', pageNo: '1', [pName]: ING })
    const tc = r.status === 200 ? extractXmlValue(r.raw, 'totalCount') : null
    const items = r.status === 200 ? parseXmlItem(r.raw) : []
    if (items.length > 0) {
      console.log(`✅ totalCount=${tc}, 필드: ${Object.keys(items[0]).join(', ')}`)
      passed++
    } else {
      console.log(`totalCount=${tc ?? r.status}`)
    }
  }

  // 아이템 이름으로도 시도
  console.log('\n  [약품명 파라미터명 탐색]')
  for (const pName of ['itemName', 'itemNm', 'drugName', 'drugNm', 'mdctnNm', 'itmNm']) {
    process.stdout.write(`    ${pName}=노바스크... `)
    const r = await get(DGAMT_URL, { serviceKey: KEY, numOfRows: '1', pageNo: '1', [pName]: '노바스크' })
    const tc = r.status === 200 ? extractXmlValue(r.raw, 'totalCount') : null
    const items = r.status === 200 ? parseXmlItem(r.raw) : []
    if (items.length > 0) {
      console.log(`✅ totalCount=${tc}, 필드: ${Object.keys(items[0]).join(', ')}`)
      passed++
    } else {
      console.log(`totalCount=${tc ?? r.status}`)
    }
  }

  // 파라미터 없이 큰 numOfRows (전체 목록 시도)
  process.stdout.write('\n  [파라미터 없음 numOfRows=5]... ')
  const rAll = await get(DGAMT_URL, { serviceKey: KEY, numOfRows: '5', pageNo: '1' })
  const tcAll = rAll.status === 200 ? extractXmlValue(rAll.raw, 'totalCount') : null
  const itemsAll = rAll.status === 200 ? parseXmlItem(rAll.raw) : []
  if (itemsAll.length > 0) {
    console.log(`✅ totalCount=${tcAll}, 필드: ${Object.keys(itemsAll[0]).join(', ')}`)
    console.log('   첫 값:', JSON.stringify(itemsAll[0]))
    passed++
  } else {
    console.log(`totalCount=${tcAll ?? rAll.status}, raw: ${rAll.raw?.slice(0, 300)}`)
  }

  console.log(`\n${'─'.repeat(50)}`)
  console.log(`결과: ${passed}개 통과, ${failed}개 실패`)
}

main().catch(e => { console.error(e); process.exit(1) })
