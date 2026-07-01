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

  // ── 2. dgamtCrtrInfoService1.2 / getDgamtList — 확인된 파라미터로 실제 데이터 검증
  console.log('\n■ dgamtCrtrInfoService1.2/getDgamtList 데이터 검증')

  // itmNm=노바스크 — 20건 반환 확인됨, 실제 데이터 내용 출력
  process.stdout.write('  itmNm=노바스크 (첫 3건)... ')
  const rNm = await get(DGAMT_URL, { serviceKey: KEY, numOfRows: '3', pageNo: '1', itmNm: '노바스크' })
  if (rNm.status === 200) {
    const tc = extractXmlValue(rNm.raw, 'totalCount')
    const items = parseXmlItem(rNm.raw)
    if (items.length > 0) {
      console.log(`✅ totalCount=${tc}`)
      for (const it of items) console.log(`   → mdsCd=${it.mdsCd} gnlNmCd=${it.gnlNmCd} itmNm=${it.itmNm} nomNm=${it.nomNm} mxCprc=${it.mxCprc} mnfEntpNm=${it.mnfEntpNm}`)
      passed++
    } else {
      console.log(`⚠️  totalCount=${tc}, 아이템 없음`)
    }
  } else {
    console.log(`❌ HTTP ${rNm.status}`)
    failed++
  }

  // mdsCd (응답 필드명) 를 검색 파라미터로도 시도 — EDI 코드 검색용
  process.stdout.write('\n  mdsCd=073400360 (노바스크 5mg EDI)... ')
  const rMdsCd = await get(DGAMT_URL, { serviceKey: KEY, numOfRows: '1', pageNo: '1', mdsCd: '073400360' })
  if (rMdsCd.status === 200) {
    const tc = extractXmlValue(rMdsCd.raw, 'totalCount')
    const items = parseXmlItem(rMdsCd.raw)
    if (items.length > 0) {
      console.log(`✅ totalCount=${tc}, mxCprc=${items[0].mxCprc}`)
      passed++
    } else {
      console.log(`totalCount=${tc}`)
    }
  } else {
    console.log(`❌ HTTP ${rMdsCd.status}`)
  }

  // gnlNmCd (응답 필드명) 를 검색 파라미터로도 시도 — 성분코드 검색용
  process.stdout.write('\n  gnlNmCd=107601ATB (암로디핀 5mg 성분코드)... ')
  const rGnl = await get(DGAMT_URL, { serviceKey: KEY, numOfRows: '3', pageNo: '1', gnlNmCd: '107601ATB' })
  if (rGnl.status === 200) {
    const tc = extractXmlValue(rGnl.raw, 'totalCount')
    const items = parseXmlItem(rGnl.raw)
    if (items.length > 0) {
      console.log(`✅ totalCount=${tc}`)
      for (const it of items) console.log(`   → mdsCd=${it.mdsCd} itmNm=${it.itmNm} mxCprc=${it.mxCprc}`)
      passed++
    } else {
      console.log(`totalCount=${tc}`)
    }
  } else {
    console.log(`❌ HTTP ${rGnl.status}`)
  }

  // ── 로수젯(로수바스타틴+에제티미브) 브랜드 코드 탐색 — DRUG_CONFIGS 추가용
  console.log('\n■ 로수젯 브랜드 코드 탐색 (itmNm=로수젯, 규격별 mdsCd/gnlNmCd/약가)')
  const rRozu = await get(DGAMT_URL, { serviceKey: KEY, numOfRows: '30', pageNo: '1', itmNm: '로수젯' })
  if (rRozu.status === 200) {
    const items = parseXmlItem(rRozu.raw)
    console.log(`  totalCount=${extractXmlValue(rRozu.raw, 'totalCount')}, ${items.length}건`)
    for (const it of items) {
      console.log(`   → mdsCd=${it.mdsCd} gnlNmCd=${it.gnlNmCd} mxCprc=${it.mxCprc} mnfEntpNm=${it.mnfEntpNm} itmNm=${it.itmNm}`)
    }
  } else {
    console.log(`  ❌ HTTP ${rRozu.status}`)
  }

  console.log(`\n${'─'.repeat(50)}`)
  console.log(`결과: ${passed}개 통과, ${failed}개 실패`)
}

main().catch(e => { console.error(e); process.exit(1) })
