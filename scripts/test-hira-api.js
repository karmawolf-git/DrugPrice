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

  // ── 2. dgamtCrtrInfoService1.2 / getDgamtList — XML 응답 파싱
  console.log('\n■ dgamtCrtrInfoService1.2/getDgamtList (XML 파싱)')

  // EDI 코드로 1건 조회해서 XML 구조 확인
  process.stdout.write('  [ediCode=073400360 (노바스크 5mg)]... ')
  const r2 = await get(DGAMT_URL, { serviceKey: KEY, numOfRows: '1', pageNo: '1', ediCode: '073400360' })
  if (r2.status === 200 && r2.raw) {
    const totalCount = extractXmlValue(r2.raw, 'totalCount')
    const items = parseXmlItem(r2.raw)
    if (items.length > 0) {
      console.log(`✅ HTTP 200 — totalCount=${totalCount}`)
      console.log('   첫 번째 아이템 필드:', Object.keys(items[0]).join(', '))
      console.log('   첫 번째 아이템 값:', JSON.stringify(items[0], null, 2))
      passed++
    } else {
      console.log(`⚠️  HTTP 200 — 아이템 없음, totalCount=${totalCount}`)
      console.log('   원본 XML (처음 500자):', r2.raw.slice(0, 500))
    }
  } else {
    console.log(`❌ HTTP ${r2.status} — ${r2.raw?.slice(0, 150)}`)
    failed++
  }

  // 성분코드로도 확인
  process.stdout.write('\n  [ingrCode=107601ATB (암로디핀 5mg)]... ')
  const r3 = await get(DGAMT_URL, { serviceKey: KEY, numOfRows: '3', pageNo: '1', ingrCode: '107601ATB' })
  if (r3.status === 200 && r3.raw) {
    const totalCount = extractXmlValue(r3.raw, 'totalCount')
    const items = parseXmlItem(r3.raw)
    if (items.length > 0) {
      console.log(`✅ totalCount=${totalCount}, ${items.length}건 수신`)
      console.log('   필드명:', Object.keys(items[0]).join(', '))
      passed++
    } else {
      console.log(`⚠️  totalCount=${totalCount}, 아이템 파싱 실패`)
      console.log('   원본:', r3.raw.slice(0, 500))
    }
  } else {
    console.log(`❌ HTTP ${r3.status}`)
    failed++
  }

  // 파라미터 없이 첫 페이지 (전체 목록 샘플)
  process.stdout.write('\n  [파라미터 없음, numOfRows=1]... ')
  const r4 = await get(DGAMT_URL, { serviceKey: KEY, numOfRows: '1', pageNo: '1' })
  if (r4.status === 200 && r4.raw) {
    const totalCount = extractXmlValue(r4.raw, 'totalCount')
    const items = parseXmlItem(r4.raw)
    if (items.length > 0) {
      console.log(`✅ totalCount=${totalCount}`)
      console.log('   필드명:', Object.keys(items[0]).join(', '))
      passed++
    } else {
      console.log(`⚠️  totalCount=${totalCount}, 아이템 없음`)
      console.log('   원본:', r4.raw.slice(0, 500))
    }
  } else {
    console.log(`❌ HTTP ${r4.status}`)
  }

  console.log(`\n${'─'.repeat(50)}`)
  console.log(`결과: ${passed}개 통과, ${failed}개 실패`)
}

main().catch(e => { console.error(e); process.exit(1) })
