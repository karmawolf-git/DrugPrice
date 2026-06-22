#!/usr/bin/env node
/**
 * HIRA(건강보험심사평가원) 약가기준정보조회서비스 API로 약가 데이터를 가져와
 * src/data/drugs.js, src/data/allGenerics.js, src/data/apiMeta.js 를 자동 업데이트합니다.
 *
 * 실행: DATA_GO_KR_KEY=xxx node scripts/fetch-hira-prices.js
 * GitHub Actions: deploy.yml 에서 자동 실행
 *
 * 사용 API: dgamtCrtrInfoService1.2/getDgamtList
 * 브랜드 조회: mdsCd (EDI코드) → 단건 정확 조회
 * 제네릭 조회: gnlNmCd (성분코드) 직접 검색 → 상표명 제네릭도 누락 없이 수집
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
// 약품별 설정
// brandEdi: 브랜드 약품의 EDI 코드 (mdsCd 파라미터로 조회)
// ingCode:  성분코드 (gnlNmCd — 제네릭 직접 조회 및 분류에 사용)
// ─────────────────────────────────────────────────────────────────────────────
const DRUG_CONFIGS = {
  norvasc: {
    specs: [
      { specKey: '5mg',   ingCode: '107601ATB', brandEdi: '073400360' },
      { specKey: '10mg',  ingCode: '107602ATB', brandEdi: '073400390' },
      { specKey: '2.5mg', ingCode: '107603ATB', brandEdi: '073400370' },
    ],
  },
  lipitor: {
    specs: [
      { specKey: '10mg',  ingCode: '111501ATB', brandEdi: '073400340' },
      { specKey: '20mg',  ingCode: '111502ATB', brandEdi: '073400330' },
      { specKey: '40mg',  ingCode: '111503ATB', brandEdi: '073400350' },
      { specKey: '80mg',  ingCode: '111504ATB', brandEdi: '073400380' },
    ],
  },
  'lipitor-plus': {
    specs: [
      { specKey: '10/10mg', ingCode: '633800ATB', brandEdi: '645405820' },
      { specKey: '10/20mg', ingCode: '633900ATB', brandEdi: '645405830' },
      { specKey: '10/40mg', ingCode: '634800ATB', brandEdi: '645405810' },
    ],
  },
  lyrica: {
    specs: [
      { specKey: '25mg',  ingCode: '480405ATB', brandEdi: '073400230' },
      { specKey: '50mg',  ingCode: '480406ATB', brandEdi: '073400240' },
      { specKey: '75mg',  ingCode: '480401ATB', brandEdi: '073400200' },
      { specKey: '150mg', ingCode: '480402ATB', brandEdi: '073400210' },
      { specKey: '300mg', ingCode: '480403ATB', brandEdi: '073400220' },
    ],
  },
  celebrex: {
    specs: [
      { specKey: '100mg', ingCode: '347702ATB', brandEdi: '073400290' },
      { specKey: '200mg', ingCode: '347701ATB', brandEdi: '073400280' },
      { specKey: '400mg', ingCode: '347703ATB', brandEdi: '073400300' },
    ],
  },
  caduet: {
    specs: [
      { specKey: '5/10mg',  ingCode: '472300ATB', brandEdi: '073400160' },
      { specKey: '5/20mg',  ingCode: '472400ATB', brandEdi: '073400180' },
      { specKey: '5/40mg',  ingCode: '472500ATB', brandEdi: '073400170' },
      { specKey: '10/20mg', ingCode: '518900ATB', brandEdi: '073400190' },
    ],
  },
}

// HIRA 약가기준정보조회서비스 (dgamtCrtrInfoService1.2)
const HIRA_BASE = 'https://apis.data.go.kr/B551182/dgamtCrtrInfoService1.2/getDgamtList'

// ─────────────────────────────────────────────────────────────────────────────
// XML 유틸리티 (HIRA API는 XML만 지원, type=json 무시됨)
// ─────────────────────────────────────────────────────────────────────────────
function parseXmlItems(xml) {
  const items = []
  const itemRe = /<item>([\s\S]*?)<\/item>/g
  let m
  while ((m = itemRe.exec(xml)) !== null) {
    const fieldRe = /<(\w+)>([^<]*)<\/\1>/g
    const obj = {}
    let f
    while ((f = fieldRe.exec(m[1])) !== null) obj[f[1]] = f[2]
    items.push(obj)
  }
  return items
}

function extractXmlValue(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}>([^<]*)<\\/${tag}>`))
  return m ? m[1] : null
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP 유틸리티
// ─────────────────────────────────────────────────────────────────────────────
function fetchRaw(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http
    const req = lib.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }, (res) => {
      let data = ''
      res.on('data', c => { data += c })
      res.on('end', () => resolve({ status: res.statusCode, raw: data }))
    })
    req.on('error', reject)
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('timeout')) })
  })
}

function buildUrl(params) {
  // serviceKey는 이미 URL인코딩된 형식으로 발급되므로 추가 인코딩 금지
  const qs = Object.entries(params)
    .map(([k, v]) => k === 'serviceKey' ? `${k}=${v}` : `${k}=${encodeURIComponent(v)}`)
    .join('&')
  return `${HIRA_BASE}?${qs}`
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

// ─────────────────────────────────────────────────────────────────────────────
// API 응답 아이템 파싱
// dgamtCrtrInfoService1.2 응답 필드:
//   itmNm     = 약품명
//   mnfEntpNm = 제조사명
//   mxCprc    = 최고가격(급여상한금액)
//   mdsCd     = 약품코드(EDI코드)
//   gnlNmCd   = 일반명코드(성분코드)
// ─────────────────────────────────────────────────────────────────────────────
function parseItem(item) {
  const productName = (item.itmNm ?? '').replace(/\s*[\(_（].*$/, '').trim()
  const manufacturer = (item.mnfEntpNm ?? '').trim()
  const price = parseInt(item.mxCprc ?? 0, 10)
  const ingCode = (item.gnlNmCd ?? '').trim()
  const ediCode = (item.mdsCd ?? '').trim()
  return { productName, manufacturer, price, ingCode, ediCode }
}

// ─────────────────────────────────────────────────────────────────────────────
// 브랜드 약가 조회: mdsCd (EDI 코드) 로 단건 조회
// ─────────────────────────────────────────────────────────────────────────────
async function fetchByMdsCd(mdsCd) {
  const url = buildUrl({
    serviceKey: SERVICE_KEY,
    numOfRows: '1',
    pageNo: '1',
    mdsCd,
  })
  const { status, raw } = await fetchRaw(url)
  if (status !== 200 || !raw) {
    return { error: `HTTP ${status}` }
  }
  const resultCode = extractXmlValue(raw, 'resultCode')
  if (resultCode !== '00') {
    return { error: `resultCode=${resultCode}` }
  }
  const items = parseXmlItems(raw)
  return items.length > 0 ? { item: items[0] } : { error: 'no items' }
}

// ─────────────────────────────────────────────────────────────────────────────
// 제네릭 일괄 조회: gnlNmCd (성분코드) 로 페이지네이션하며 전체 수집
// itmNm 접두어 검색과 달리 상표명 제네릭도 빠짐없이 조회됨
// ─────────────────────────────────────────────────────────────────────────────
async function fetchAllByGnlNmCd(gnlNmCd) {
  const allItems = []
  let pageNo = 1
  while (true) {
    const url = buildUrl({
      serviceKey: SERVICE_KEY,
      numOfRows: '100',
      pageNo: String(pageNo),
      gnlNmCd,
    })
    const { status, raw } = await fetchRaw(url)
    if (status !== 200 || !raw) break
    const resultCode = extractXmlValue(raw, 'resultCode')
    if (resultCode !== '00') break
    const items = parseXmlItems(raw)
    allItems.push(...items)
    if (items.length < 100) break
    pageNo++
    await sleep(200)
  }
  return allItems
}

// ─────────────────────────────────────────────────────────────────────────────
// 메인 로직
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== HIRA 약가 데이터 자동 업데이트 ===\n')
  console.log('서비스: dgamtCrtrInfoService1.2/getDgamtList\n')

  // ── 1. 브랜드 약가 조회 (EDI 코드 → mdsCd 파라미터)
  // 브랜드 API 응답에서 실제 gnlNmCd 를 confirmedIngCodes 에 저장 →
  // 하드코딩 ingCode 대신 사용하여 제네릭 조회 정확도 향상
  console.log('■ 브랜드 약가 조회 (mdsCd=EDI코드)')
  const brandPrices = {}
  const confirmedIngCodes = {} // drugId → { specKey → 실제 gnlNmCd }
  let brandFetched = 0

  for (const [drugId, { specs }] of Object.entries(DRUG_CONFIGS)) {
    brandPrices[drugId] = {}
    confirmedIngCodes[drugId] = {}
    for (const { specKey, brandEdi, ingCode: fallbackIngCode } of specs) {
      const { item, error } = await fetchByMdsCd(brandEdi)
      if (error || !item) {
        console.warn(`  ⚠️  ${drugId} ${specKey} (${brandEdi}): ${error}`)
        confirmedIngCodes[drugId][specKey] = fallbackIngCode
        await sleep(200)
        continue
      }
      const { price, productName, ingCode: apiIngCode } = parseItem(item)
      confirmedIngCodes[drugId][specKey] = apiIngCode || fallbackIngCode
      if (price) {
        brandPrices[drugId][specKey] = price
        brandFetched++
        console.log(`  ${drugId} ${specKey}: ${price.toLocaleString()}원 (${productName}) [gnlNmCd=${confirmedIngCodes[drugId][specKey]}]`)
      } else {
        console.warn(`  ⚠️  ${drugId} ${specKey}: mxCprc 없음`)
      }
      await sleep(100)
    }
  }

  if (brandFetched === 0) {
    console.error('❌ 브랜드 약가 조회 실패 — API 응답 없음')
    process.exit(1)
  }

  // ── 2. drugs.js 브랜드 가격 업데이트
  console.log('\n■ drugs.js 브랜드 약가 업데이트')
  let drugsSrc = fs.readFileSync('./src/data/drugs.js', 'utf-8')

  for (const [drugId, priceMap] of Object.entries(brandPrices)) {
    if (Object.keys(priceMap).length === 0) continue

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
      const specEscaped = specKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const specRe = new RegExp(
        `(spec:\\s*['"]${specEscaped}['"][^}]*insurancePrice:\\s*)(\\d+)`,
        'g'
      )
      updated = updated.replace(specRe, (_, prefix, oldPrice) => {
        if (parseInt(oldPrice) !== newPrice) anyChanged = true
        return `${prefix}${newPrice}`
      })
    }

    if (anyChanged) {
      drugsSrc = drugsSrc.slice(0, openBracket + 1) + updated + drugsSrc.slice(i - 1)
      console.log(`  ${drugId}: 가격 업데이트`)
    } else {
      console.log(`  ${drugId}: 변경 없음`)
    }
  }

  fs.writeFileSync('./src/data/drugs.js', drugsSrc, 'utf-8')

  // ── 3. 제네릭 약가 조회 (gnlNmCd 성분코드 직접 검색)
  // itmNm 접두어 검색 대신 gnlNmCd 로 직접 조회하여
  // 상표명으로 등록된 제네릭까지 누락 없이 수집
  console.log('\n■ 제네릭 약가 조회 (gnlNmCd 성분코드 직접 검색)')
  const genericData = {}
  let genericFetched = 0
  const gnlNmCdCache = {} // ingCode → items[] (중복 API 호출 방지)

  for (const [drugId, { specs }] of Object.entries(DRUG_CONFIGS)) {
    const allBrandEdis = new Set(specs.map(s => s.brandEdi))
    const specGroups = {}
    let drugTotal = 0

    for (const { specKey } of specs) {
      const ingCode = confirmedIngCodes[drugId]?.[specKey]
      if (!ingCode) {
        console.log(`  ${drugId} ${specKey}: ingCode 없음, 스킵`)
        continue
      }

      if (!gnlNmCdCache[ingCode]) {
        process.stdout.write(`  ${drugId} ${specKey} (gnlNmCd=${ingCode})... `)
        gnlNmCdCache[ingCode] = await fetchAllByGnlNmCd(ingCode)
        console.log(`${gnlNmCdCache[ingCode].length}건`)
        await sleep(200)
      }

      const items = gnlNmCdCache[ingCode]
      const generics = items
        .filter(item => !allBrandEdis.has((item.mdsCd ?? '').trim()))
        .map(item => {
          const parsed = parseItem(item)
          return {
            productName: parsed.productName,
            manufacturer: parsed.manufacturer,
            specKey,
            insurancePrice: parsed.price,
          }
        })
        .filter(g => g.insurancePrice > 0)

      generics.sort((a, b) => a.insurancePrice - b.insurancePrice)
      specGroups[specKey] = generics
      genericFetched += generics.length
      drugTotal += generics.length
      console.log(`    → ${specKey}: ${generics.length}개`)
    }

    console.log(`  ${drugId}: 총 ${drugTotal}개`)
    genericData[drugId] = specGroups
  }

  // ── 4. allGenerics.js 재생성
  console.log('\n■ allGenerics.js 재생성')
  const today = new Date().toISOString().slice(0, 10)
  let genericsContent = `// 자동 생성 — fetch-hira-prices.js (${today})\nconst allGenerics = {\n`

  for (const [drugId, specGroups] of Object.entries(genericData)) {
    if (Object.keys(specGroups).length === 0) continue
    genericsContent += `  "${drugId}": [\n`
    // specs 순서를 DRUG_CONFIGS 순서에 맞춰 정렬
    const specOrder = DRUG_CONFIGS[drugId].specs.map(s => s.specKey)
    for (const specKey of specOrder) {
      const items = specGroups[specKey] ?? []
      for (const item of items) {
        genericsContent += `    ${JSON.stringify(item)},\n`
      }
    }
    genericsContent += `  ],\n`
  }

  genericsContent += `}\n\nexport default allGenerics\n`
  fs.writeFileSync('./src/data/allGenerics.js', genericsContent, 'utf-8')
  console.log(`  allGenerics.js 재생성 완료 (총 ${genericFetched}개)`)

  // ── 5. apiMeta.js 타임스탬프 기록
  const now = new Date().toISOString()
  const metaContent = `// 자동 생성 — fetch-hira-prices.js
export const apiMeta = {
  lastFetched: '${now}',
  source: '건강보험심사평가원 (HIRA)',
  apiEndpoint: 'dgamtCrtrInfoService1.2/getDgamtList',
}
`
  fs.writeFileSync('./src/data/apiMeta.js', metaContent, 'utf-8')

  console.log(`\n✅ 완료 — 브랜드 ${brandFetched}건, 제네릭 ${genericFetched}건 업데이트`)
  console.log('   drugs.js, allGenerics.js, apiMeta.js 업데이트됨')
}

main().catch(e => { console.error(e); process.exit(1) })
