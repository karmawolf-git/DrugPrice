#!/usr/bin/env node
/**
 * HIRA API 연결 빠른 확인 스크립트
 * 실행: DATA_GO_KR_KEY=YOUR_KEY node scripts/test-hira-api.js
 *
 * 확인 항목:
 * 1. API 키 유효성
 * 2. 브랜드 약가 조회 (EDI 코드)
 * 3. 성분코드 파라미터 지원 여부 (전략 1)
 * 4. 페이지 순회 가능 여부 (전략 2)
 */

import https from 'https'

const KEY = process.env.DATA_GO_KR_KEY || process.argv[2]
if (!KEY) {
  console.error('사용법: DATA_GO_KR_KEY=YOUR_KEY node scripts/test-hira-api.js')
  process.exit(1)
}

const BASE = 'https://apis.data.go.kr/B551182/msInsItemPriceInfoService/getMsInsItemPriceInfo'

function get(params) {
  const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')
  const url = `${BASE}?${qs}`
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let body = ''
      res.on('data', c => body += c)
      res.on('end', () => {
        try { resolve({ status: res.statusCode, json: JSON.parse(body), raw: body }) }
        catch { resolve({ status: res.statusCode, json: null, raw: body }) }
      })
    }).on('error', reject).setTimeout(15000, function() { this.destroy() })
  })
}

function getBody(json) {
  return json?.response?.body ?? json?.body
}

async function main() {
  console.log('=== HIRA API 연결 테스트 ===\n')
  let passed = 0, failed = 0

  // ── 1. 브랜드 약가 조회 (노바스크 5mg, EDI: 073400360)
  process.stdout.write('1. 브랜드 약가 조회 (노바스크 5mg)... ')
  const r1 = await get({ serviceKey: KEY, type: 'json', numOfRows: '1', ediCode: '073400360' })
  if (r1.status === 200 && getBody(r1.json)?.totalCount > 0) {
    const item = getBody(r1.json)?.items?.item
    const p = Array.isArray(item) ? item[0] : item
    const price = p?.maximumPrice ?? p?.MAXIMUM_PRICE
    console.log(`✅ ${p?.itemName ?? p?.ITEM_NAME} = ${price}원`)

    // 응답 필드 전체 출력 (성분코드 포함 여부 확인)
    console.log('   응답 필드:', Object.keys(p || {}).join(', '))
    passed++
  } else {
    console.log(`❌ HTTP ${r1.status}`)
    if (r1.raw) console.log('   응답:', r1.raw.slice(0, 200))
    failed++
  }

  // ── 2. 성분코드 파라미터 지원 여부 (전략 1)
  process.stdout.write('\n2. 성분코드 파라미터 지원 여부 (ingrCode=107601ATB)... ')
  const r2 = await get({ serviceKey: KEY, type: 'json', numOfRows: '5', ingrCode: '107601ATB' })
  const body2 = getBody(r2.json)
  if (r2.status === 200 && (body2?.totalCount ?? 0) > 0) {
    console.log(`✅ 지원됨! ${body2.totalCount}건 (노바스크 5mg 계열)`)
    console.log('   → 전략 1 사용 가능 — 빠른 조회 가능')
    passed++
  } else {
    const msg = body2?.totalCount === 0 ? '결과 없음 (파라미터 무시됨)' : `HTTP ${r2.status}`
    console.log(`⚠️  미지원: ${msg}`)
    console.log('   → 전략 2(전체 페이지 순회)로 동작합니다')
    // 실패는 아님 — 전략 2로 fallback
  }

  // ── 3. 전체 조회 1페이지 확인 (전략 2 전제 조건)
  process.stdout.write('\n3. 전체 페이지 순회 가능 여부 (1페이지, 10건)... ')
  const r3 = await get({ serviceKey: KEY, type: 'json', numOfRows: '10', pageNo: '1' })
  const body3 = getBody(r3.json)
  if (r3.status === 200 && body3?.items?.item) {
    const items = body3.items.item
    const count = Array.isArray(items) ? items.length : 1
    console.log(`✅ 총 ${body3.totalCount?.toLocaleString()}건, ${count}건 수신`)
    passed++
  } else {
    console.log(`❌ HTTP ${r3.status}: ${r3.raw?.slice(0, 100)}`)
    failed++
  }

  // ── 4. 카듀엣 브랜드 가격 확인
  process.stdout.write('\n4. 카듀엣 5/10mg 가격 확인 (EDI: 073400160)... ')
  const r4 = await get({ serviceKey: KEY, type: 'json', numOfRows: '1', ediCode: '073400160' })
  const body4 = getBody(r4.json)
  if (r4.status === 200 && body4?.totalCount > 0) {
    const item = body4?.items?.item
    const p = Array.isArray(item) ? item[0] : item
    const price = p?.maximumPrice ?? p?.MAXIMUM_PRICE
    console.log(`✅ ${p?.itemName ?? p?.ITEM_NAME} = ${price}원`)
    passed++
  } else {
    console.log(`❌ HTTP ${r4.status}`)
    failed++
  }

  console.log(`\n${'─'.repeat(40)}`)
  console.log(`결과: ${passed}개 통과, ${failed}개 실패`)
  if (failed === 0) console.log('✅ API 연결 정상 — fetch-hira-prices.js 실행 가능')
  else console.log('❌ 위 항목 확인 후 재시도')
}

main().catch(e => { console.error(e); process.exit(1) })
