#!/usr/bin/env node
/**
 * HIRA(건강보험심사평가원) API로 약가 데이터를 가져와
 * src/data/allGenerics.js 와 src/data/drugs.js 를 자동 업데이트합니다.
 *
 * 실행: DATA_GO_KR_KEY=xxx node scripts/fetch-hira-prices.js
 * GitHub Actions: update-hira-prices.yml 에서 자동 실행
 */

import https from 'https'
import http from 'http'
import fs from 'fs'

const SERVICE_KEY = process.env.DATA_GO_KR_KEY || process.argv[2]
if (!SERVICE_KEY) {
  console.error('❌ DATA_GO_KR_KEY 환경변수 필요')
  process.exit(1)
}

// ─────────────────────────────────────────────────────────────────────────────
// 약품별 설정: ingCode → specKey 매핑 (HIRA Excel 2026.6.1 기준)
// brandEdi: 브랜드 약품의 EDI 코드 (약가 조회용)
// ─────────────────────────────────────────────────────────────────────────────
const DRUG_CONFIGS = {
  norvasc: [
    { specKey: '5mg',   ingCode: '107601ATB', brandEdi: '073400360' },
    { specKey: '10mg',  ingCode: '107602ATB', brandEdi: '073400390' },
    { specKey: '2.5mg', ingCode: '107603ATB', brandEdi: '073400370' },
  ],
  lipitor: [
    { specKey: '10mg',  ingCode: '111501ATB', brandEdi: '073400340' },
    { specKey: '20mg',  ingCode: '111502ATB', brandEdi: '073400330' },
    { specKey: '40mg',  ingCode: '111503ATB', brandEdi: '073400350' },
    { specKey: '80mg',  ingCode: '111504ATB', brandEdi: '073400380' },
  ],
  'lipitor-plus': [
    { specKey: '10/10mg', ingCode: '633800ATB', brandEdi: '645405820' },
    { specKey: '10/20mg', ingCode: '633900ATB', brandEdi: '645405830' },
    { specKey: '10/40mg', ingCode: '634800ATB', brandEdi: '645405810' },
  ],
  lyrica: [
    { specKey: '25mg',  ingCode: '480405ATB', brandEdi: '073400230' },
    { specKey: '50mg',  ingCode: '480406ATB', brandEdi: '073400240' },
    { specKey: '75mg',  ingCode: '480401ATB', brandEdi: '073400200' },
    { specKey: '150mg', ingCode: '480402ATB', brandEdi: '073400210' },
    { specKey: '300mg', ingCode: '480403ATB', brandEdi: '073400220' },
  ],
  celebrex: [
    { specKey: '100mg', ingCode: '347702ATB', brandEdi: '073400290' },
    { specKey: '200mg', ingCode: '347701ATB', brandEdi: '073400280' },
    { specKey: '400mg', ingCode: '347703ATB', brandEdi: '073400300' },
  ],
  caduet: [
    { specKey: '5/10mg',  ingCode: '472300ATB', brandEdi: '073400160' },
    { specKey: '5/20mg',  ingCode: '472400ATB', brandEdi: '073400180' },
    { specKey: '5/40mg',  ingCode: '472500ATB', brandEdi: '073400170' },
    { specKey: '10/20mg', ingCode: '518900ATB', brandEdi: '073400190' },
  ],
}

// 성분코드 → {drugId, specKey} 역방향 맵 (API 결과 필터링용)
const ING_CODE_MAP = {}
for (const [drugId, specs] of Object.entries(DRUG_CONFIGS)) {
  for (const s of specs) {
    ING_CODE_MAP[s.ingCode] = { drugId, specKey: s.specKey }
  }
}

// HIRA drug price API endpoints
const HIRA_BASE = 'https://apis.data.go.kr/B551182/msInsItemPriceInfoService'

// ─────────────────────────────────────────────────────────────────────────────
// HTTP 유틸리티
// ─────────────────────────────────────────────────────────────────────────────
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http
    const req = lib.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
    }, (res) => {
      let data = ''
      res.on('data', c => { data += c })
      res.on('end', () => {
        try { resolve({ status: res.statusCode, json: JSON.parse(data) }) }
        catch { resolve({ status: res.statusCode, json: null, raw: data }) }
      })
    })
    req.on('error', reject)
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('timeout')) })
  })
}

function buildUrl(endpoint, params) {
  const qs = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&')
  return `${HIRA_BASE}/${endpoint}?${qs}`
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

// ─────────────────────────────────────────────────────────────────────────────
// 전략 1: 성분코드(ingCode)로 조회 — getMsInsItemPriceInfo?ingrCode=...
// HIRA API가 ingrCode 파라미터를 지원하면 약품별 1회 호출로 완료
// ─────────────────────────────────────────────────────────────────────────────
async function fetchByIngCode(ingCode) {
  const url = buildUrl('getMsInsItemPriceInfo', {
    serviceKey: SERVICE_KEY,
    type: 'json',
    numOfRows: '999',
    pageNo: '1',
    ingrCode: ingCode,
  })
  const { status, json, raw } = await fetchJson(url)
  if (status !== 200 || !json) {
    if (ingCode === Object.keys(ING_CODE_MAP)[0]) {
      console.warn(`  첫 번째 조회 HTTP ${status}: ${(raw ?? '').slice(0, 300)}`)
    }
    return null
  }

  const totalCount = json?.response?.body?.totalCount
    ?? json?.body?.totalCount
    ?? 0
  if (totalCount === 0) return null

  const rawItems = json?.response?.body?.items?.item
    ?? json?.body?.items?.item
    ?? []
  return Array.isArray(rawItems) ? rawItems : [rawItems]
}

// ─────────────────────────────────────────────────────────────────────────────
// 전략 2: 전체 페이지 순회 — 성분코드 파라미터 미지원 시 대체 전략
// 전체 21,000+건을 1,000건씩 조회하여 성분코드로 필터링
// 참고: API 응답에 성분코드가 없으면 아래 filterByIngCode 함수가 사용됨
// ─────────────────────────────────────────────────────────────────────────────
async function fetchAllPrices() {
  console.log('  전체 약가 데이터 페이지 순회 시작...')
  const PAGE_SIZE = 100
  let pageNo = 1
  let totalFetched = 0
  let totalCount = null
  const allItems = []

  while (true) {
    const url = buildUrl('getMsInsItemPriceInfo', {
      serviceKey: SERVICE_KEY,
      type: 'json',
      numOfRows: String(PAGE_SIZE),
      pageNo: String(pageNo),
    })
    const { status, json, raw } = await fetchJson(url)
    if (status !== 200 || !json) {
      console.warn(`  ⚠️  페이지 ${pageNo} 조회 실패 (HTTP ${status})`)
      console.warn(`  응답 내용: ${(raw ?? '').slice(0, 400)}`)
      break
    }

    const body = json?.response?.body ?? json?.body
    if (totalCount === null) {
      totalCount = body?.totalCount ?? 0
      console.log(`  총 ${totalCount.toLocaleString()}건`)
    }

    const rawItems = body?.items?.item ?? []
    const items = Array.isArray(rawItems) ? rawItems : (rawItems ? [rawItems] : [])
    allItems.push(...items)
    totalFetched += items.length
    process.stdout.write(`\r  ${totalFetched.toLocaleString()} / ${totalCount.toLocaleString()} 건 조회 중...`)

    if (totalFetched >= totalCount || items.length === 0) break
    pageNo++
    await sleep(300) // API 부하 방지
  }
  console.log()
  return allItems
}

// ─────────────────────────────────────────────────────────────────────────────
// API 응답 아이템 파싱
// ─────────────────────────────────────────────────────────────────────────────
function parseItem(item) {
  // HIRA API 응답 필드명은 camelCase 또는 소문자 형식일 수 있음
  const productName = (item.itemName ?? item.ITEM_NAME ?? '').replace(/\s*_\(.*?\)$/, '').trim()
  const manufacturer = (item.companyName ?? item.COMPANY_NAME ?? '').trim()
  const price = parseInt(item.maximumPrice ?? item.MAXIMUM_PRICE ?? 0, 10)
  const ingCode = (item.ingrCode ?? item.INGR_CODE ?? item.classEsntlCode ?? '').trim()
  const ediCode = (item.ediCode ?? item.EDI_CODE ?? '').trim()
  return { productName, manufacturer, price, ingCode, ediCode }
}

// ─────────────────────────────────────────────────────────────────────────────
// 메인 로직
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== HIRA 약가 데이터 자동 업데이트 ===\n')

  // 결과 저장용
  const generics = {}       // { drugId: [ {productName, manufacturer, specKey, insurancePrice} ] }
  const brandPrices = {}    // { drugId: { specKey: price } }

  for (const drugId of Object.keys(DRUG_CONFIGS)) {
    generics[drugId] = []
    brandPrices[drugId] = {}
  }

  // ── Step 1: 전략 1 시도 (성분코드 파라미터)
  console.log('■ 전략 1: 성분코드 직접 조회')
  const strategy1Results = {}   // ingCode → items[]
  let strategy1Works = false

  for (const ingCode of Object.keys(ING_CODE_MAP)) {
    const items = await fetchByIngCode(ingCode)
    if (items && items.length > 0) {
      strategy1Results[ingCode] = items
      strategy1Works = true
    }
    await sleep(100)
  }

  if (strategy1Works) {
    console.log('  ✅ 성분코드 파라미터 지원 확인')
    for (const [ingCode, items] of Object.entries(strategy1Results)) {
      const { drugId, specKey } = ING_CODE_MAP[ingCode]
      for (const raw of items) {
        const { productName, manufacturer, price } = parseItem(raw)
        if (!productName || !price) continue
        generics[drugId].push({ productName, manufacturer, specKey, insurancePrice: price })
      }
      console.log(`  ${drugId} ${specKey}: ${items.length}건`)
    }
  } else {
    console.log('  ℹ️  성분코드 파라미터 미지원 → 전략 2(전체 순회)로 전환')

    // ── Step 2: 전체 데이터 다운로드 + 필터링
    console.log('\n■ 전략 2: 전체 데이터 순회')
    const allItems = await fetchAllPrices()
    let matched = 0

    for (const raw of allItems) {
      const { productName, manufacturer, price, ingCode } = parseItem(raw)
      if (!ingCode || !ING_CODE_MAP[ingCode]) continue

      const { drugId, specKey } = ING_CODE_MAP[ingCode]
      generics[drugId].push({ productName, manufacturer, specKey, insurancePrice: price })
      matched++
    }

    if (matched === 0) {
      console.error('❌ 전략 2도 실패 — API 응답에 성분코드(ingCode/classEsntlCode) 필드 없음')
      console.error('   API 응답 샘플을 확인하고 parseItem() 함수의 필드명을 조정하세요')
      process.exit(1)
    }
    console.log(`  ✅ ${matched}건 매칭`)
  }

  // ── Step 3: 브랜드 약품 가격 조회 (EDI 코드로 정확히 조회)
  console.log('\n■ 브랜드 약가 조회')
  for (const [drugId, specs] of Object.entries(DRUG_CONFIGS)) {
    for (const { specKey, brandEdi } of specs) {
      const url = buildUrl('getMsInsItemPriceInfo', {
        serviceKey: SERVICE_KEY,
        type: 'json',
        numOfRows: '1',
        pageNo: '1',
        ediCode: brandEdi,
      })
      const { status, json } = await fetchJson(url)
      if (status !== 200 || !json) continue

      const rawItems = json?.response?.body?.items?.item ?? json?.body?.items?.item
      const item = Array.isArray(rawItems) ? rawItems[0] : rawItems
      if (!item) continue

      const { price } = parseItem(item)
      if (price) {
        brandPrices[drugId][specKey] = price
        console.log(`  ${drugId} ${specKey}: ${price.toLocaleString()}원`)
      }
      await sleep(100)
    }
  }

  // ── Step 4: allGenerics.js 생성
  console.log('\n■ allGenerics.js 생성')
  const allGenericsPath = './src/data/allGenerics.js'
  const existingContent = fs.readFileSync(allGenericsPath, 'utf-8')

  let newContent = existingContent
  for (const [drugId, items] of Object.entries(generics)) {
    if (items.length === 0) {
      console.warn(`  ⚠️  ${drugId}: 조회 결과 없음 — 기존 데이터 유지`)
      continue
    }

    // 가격 순 정렬
    const sorted = [...items].sort((a, b) => a.insurancePrice - b.insurancePrice || a.productName.localeCompare(b.productName))
    const lines = sorted
      .map(g => `    ${JSON.stringify({ productName: g.productName, manufacturer: g.manufacturer, specKey: g.specKey, insurancePrice: g.insurancePrice })},`)
      .join('\n')
    const block = `  "${drugId}": [\n${lines}\n  ],`

    const regex = new RegExp(`"${drugId.replace(/-/g, '\\-')}":\\s*\\[[\\s\\S]*?\\],`, 'g')
    if (regex.test(newContent)) {
      newContent = newContent.replace(regex, block)
      console.log(`  ${drugId}: ${sorted.length}건 업데이트`)
    } else {
      console.warn(`  ⚠️  ${drugId}: allGenerics.js에서 섹션 찾기 실패`)
    }
  }

  fs.writeFileSync(allGenericsPath, newContent, 'utf-8')

  // ── Step 5: drugs.js 브랜드 가격 업데이트
  console.log('\n■ drugs.js 브랜드 약가 업데이트')
  let drugsSrc = fs.readFileSync('./src/data/drugs.js', 'utf-8')

  for (const [drugId, priceMap] of Object.entries(brandPrices)) {
    if (Object.keys(priceMap).length === 0) continue

    // prices 배열 위치 찾기
    const idPat = new RegExp(`id:\\s*['"]${drugId.replace(/-/g, '\\-')}['"]`)
    const drugStart = drugsSrc.search(idPat)
    if (drugStart === -1) continue

    const afterId = drugsSrc.slice(drugStart)
    const pricesMatch = afterId.match(/\bprices:\s*\[/)
    if (!pricesMatch) continue

    const pricesStart = drugStart + afterId.indexOf(pricesMatch[0])
    const openBracket = drugsSrc.indexOf('[', pricesStart)
    let depth = 1, i = openBracket + 1
    while (i < drugsSrc.length && depth > 0) {
      if (drugsSrc[i] === '[') depth++
      else if (drugsSrc[i] === ']') depth--
      i++
    }

    const pricesSection = drugsSrc.slice(openBracket + 1, i - 1)
    let updated = pricesSection
    let anyChanged = false

    for (const [specKey, newPrice] of Object.entries(priceMap)) {
      // spec 문자열로 매칭 (e.g., spec: '5mg')
      const specEscaped = specKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const specRe = new RegExp(
        `(spec:\\s*['"]${specEscaped}['"][^}]*insurancePrice:\\s*)(\\d+)`,
        'g'
      )
      const replaced = updated.replace(specRe, (_, prefix, oldPrice) => {
        if (parseInt(oldPrice) !== newPrice) anyChanged = true
        return `${prefix}${newPrice}`
      })
      updated = replaced
    }

    if (anyChanged) {
      drugsSrc = drugsSrc.slice(0, openBracket + 1) + updated + drugsSrc.slice(i - 1)
      console.log(`  ${drugId}: 가격 업데이트`)
    } else {
      console.log(`  ${drugId}: 변경 없음`)
    }
  }

  fs.writeFileSync('./src/data/drugs.js', drugsSrc, 'utf-8')

  // ── Step 6: apiMeta.js 타임스탬프 기록
  const now = new Date().toISOString()
  const metaContent = `// 자동 생성 — fetch-hira-prices.js
export const apiMeta = {
  lastFetched: '${now}',
  source: '건강보험심사평가원 (HIRA)',
  apiEndpoint: 'msInsItemPriceInfoService',
}
`
  fs.writeFileSync('./src/data/apiMeta.js', metaContent, 'utf-8')

  console.log('\n✅ 완료')
  console.log('   allGenerics.js, drugs.js, apiMeta.js 업데이트됨')
  console.log('   git diff src/data/ 로 변경사항 확인 후 커밋하세요')
}

main().catch(e => { console.error(e); process.exit(1) })
