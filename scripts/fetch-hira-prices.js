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
 * 제네릭 조회:
 *   - genericEdis 있는 규격: 알려진 EDI코드 목록으로 mdsCd 직접 조회 (상표명 제네릭 포함)
 *   - genericEdis 없는 규격: itmNm (성분명 전방일치) 검색 + gnlNmCd 분류
 *
 * NOTE: gnlNmCd는 API 응답 필드이며 검색 파라미터로 지원되지 않음 (totalCount=0)
 * NOTE: 상표명으로 등록된 복합제 제네릭(예: 건토젯, 아토젯)은 itmNm 검색으로 찾을 수 없으므로
 *       genericEdis 목록에 EDI코드를 하드코딩하여 mdsCd API로 직접 조회
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
// brandEdi:    브랜드 약품의 EDI 코드 (mdsCd 파라미터로 조회)
// ingCode:     성분코드 (gnlNmCd — 브랜드 확인 및 itmNm 기반 제네릭 분류에 사용)
// itmNmQuery:  제네릭 일괄 조회용 성분명 키워드 (itmNm 전방일치, genericEdis 없을 때 사용)
// genericEdis: 알려진 제네릭 EDI코드 목록 (mdsCd 직접 조회 — 상표명 제네릭 수집용)
//              이 목록이 있으면 itmNm 검색 결과에 추가하여 누락 없이 수집
// ─────────────────────────────────────────────────────────────────────────────
const DRUG_CONFIGS = {
  norvasc: {
    itmNmQuery: '암로디핀베실산염',
    specs: [
      { specKey: '5mg',   ingCode: '107601ATB', brandEdi: '073400360' },
      { specKey: '10mg',  ingCode: '107602ATB', brandEdi: '073400390' },
      { specKey: '2.5mg', ingCode: '107603ATB', brandEdi: '073400370' },
    ],
  },
  lipitor: {
    itmNmQuery: '아토르바스타틴칼슘',
    specs: [
      { specKey: '10mg',  ingCode: '111501ATB', brandEdi: '073400340' },
      { specKey: '20mg',  ingCode: '111502ATB', brandEdi: '073400330' },
      { specKey: '40mg',  ingCode: '111503ATB', brandEdi: '073400350' },
      { specKey: '80mg',  ingCode: '111504ATB', brandEdi: '073400380' },
    ],
  },
  'lipitor-plus': {
    // 에제티미브+아토르바스타틴 복합제 제네릭 수집
    //  - itmNm: INN명으로 시작하는 제네릭
    //  - genericEdis: 이미 알려진 상표명 제네릭 (안정적 baseline)
    //  - autoDiscover: 상표명 접두어 확장 검색 → gnlNmCd로 성분 필터링
    //    (신규 상표명 제네릭까지 동적으로 포착, 하드코딩 목록 노후화 방지)
    itmNmQuery: ['아토르바스타틴칼슘', '에제티미브'],
    ingredientFilter: ['에제티미브', '아토르바스타틴'],
    autoDiscover: true,
    specs: [
      {
        specKey: '10/10mg',
        ingCode: '633800ATB',
        brandEdi: '645405820',
        // 633800ATB (에제티미브 10mg + 아토르바스타틴 10mg) 등록 제네릭 EDI코드 목록
        genericEdis: [
          '073001640','052402040','053601630','054801260','057600860','059001010','059400060',
          '621804250','622804530','625202110','628901970','640904190','641607520','641705920',
          '642105690','642308510','642405210','642707030','642803350','642906530','643606070',
          '644004530','645210490','645605510','645907150','646005220','646204270','647303990',
          '648604200','649405580','649508090','649606370','649703150','649807810','650304250',
          '652904510','653805900','654005660','654702180','655404170','655605300','657203800',
          '657308490','658108180','658204560','658502410','660703510','661905640','662504650',
          '669502700','669806020','669908090','670304640','670402350','670502340','670608730',
          '671706820','671807260','674101940','674402400','678601890','689001550','693202420',
          '694003390','697101040','698504730','628801790','652606960','640007710','641907750',
          '643705130','644309610','644503250','644704850','648104690','648204380','649105140',
          '650205750','651205690','653404760','656005210','657807460','658604600','663608350',
          '665003030','670105120','684502040','693903400','073100410','643308630',
        ],
      },
      {
        specKey: '10/20mg',
        ingCode: '633900ATB',
        brandEdi: '645405830',
        // 633900ATB (에제티미브 10mg + 아토르바스타틴 20mg) 등록 제네릭 EDI코드 목록
        genericEdis: [
          '641607530','052402030','053601610','054801270','057600850','059001000','059400050',
          '621804240','622804520','625202120','628901960','640904200','641705930','642105700',
          '642308500','642405190','642707040','642803360','642906520','643606080','644004540',
          '645210480','645605520','645907140','646005230','646204280','647304000','648604210',
          '649508080','649606020','649703160','649807800','650304240','652904520','653805910',
          '654005670','655404180','655605310','657203790','657308470','658108190','658204580',
          '660703500','661905630','662504660','669502690','669806010','669908070','670304650',
          '670402370','670502350','670608740','671706810','671807250','674101950','674402410',
          '678601900','689001560','693202430','694003410','697101030','698504720','628801800',
          '652606970','640007730','641907760','643705140','644503260','644704860','648104700',
          '648204390','649105170','650205760','651205700','653404750','656005200','657807470',
          '658604610','663608360','665003040','670105130','684502060','693903390','073100380',
          '643308640',
        ],
      },
      {
        specKey: '10/40mg',
        ingCode: '634800ATB',
        brandEdi: '645405810',
        // 634800ATB (에제티미브 10mg + 아토르바스타틴 40mg) 등록 제네릭 EDI코드 목록
        genericEdis: [
          '642707050','650304230','642906540','652606980','641607540','643606090','054801280',
          '057600870','059400040','621804230','622804510','625202130','628901980','640007720',
          '641907770','642308490','642405200','644503270','644704870','646005240','647304010',
          '648104710','648604190','649105180','649703170','649807790','653404770','653805920',
          '654005680','657203780','657807480','658204570','660703520','662504670','669502680',
          '670304660','670502360','670608750','671807240','684502050','689001570','694003420',
          '628801810','073100390','642105710','643308650','645210470','657308480','678601910',
        ],
      },
    ],
  },
  lyrica: {
    itmNmQuery: '프레가발린',
    specs: [
      { specKey: '25mg',  ingCode: '480405ATB', brandEdi: '073400230' },
      { specKey: '50mg',  ingCode: '480406ATB', brandEdi: '073400240' },
      { specKey: '75mg',  ingCode: '480401ATB', brandEdi: '073400200' },
      { specKey: '150mg', ingCode: '480402ATB', brandEdi: '073400210' },
      { specKey: '300mg', ingCode: '480403ATB', brandEdi: '073400220' },
    ],
  },
  celebrex: {
    itmNmQuery: '세레콕시브',
    specs: [
      { specKey: '100mg', ingCode: '347702ATB', brandEdi: '073400290' },
      { specKey: '200mg', ingCode: '347701ATB', brandEdi: '073400280' },
      { specKey: '400mg', ingCode: '347703ATB', brandEdi: '073400300' },
    ],
  },
  caduet: {
    // itmNm 검색으로는 INN명으로 시작하는 일부만 찾을 수 있음
    // 나머지(상표명 제네릭)는 autoDiscover로 gnlNmCd 기반 전체 스캔
    itmNmQuery: ['아토르바스타틴칼슘', '암로디핀베실산염'],
    ingredientFilter: ['암로디핀', '아토르바스타틴'],
    autoDiscover: true,
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

// 복합제 품목명에서 "X/Ymg" 규격 추출
function parseDoseFromName(name) {
  const mg = '(?:밀리그램?|밀리그람|mg)'
  let m = name.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*\\/\\s*(\\d+(?:\\.\\d+)?)\\s*${mg}`, 'i'))
  if (m) return `${m[1]}/${m[2]}mg`
  m = name.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${mg}\\s*\\/\\s*(\\d+(?:\\.\\d+)?)\\s*${mg}`, 'i'))
  if (m) return `${m[1]}/${m[2]}mg`
  return null
}

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
  if (status !== 200 || !raw) return { error: `HTTP ${status}` }
  const resultCode = extractXmlValue(raw, 'resultCode')
  if (resultCode !== '00') return { error: `resultCode=${resultCode}` }
  const items = parseXmlItems(raw)
  return items.length > 0 ? { item: items[0] } : { error: 'no items' }
}

// ─────────────────────────────────────────────────────────────────────────────
// 제네릭 일괄 조회: itmNm (성분명 키워드) 로 페이지네이션하며 전체 수집
// ─────────────────────────────────────────────────────────────────────────────
async function fetchAllByItmNm(itmNm) {
  const allItems = []
  let pageNo = 1
  while (true) {
    const url = buildUrl({
      serviceKey: SERVICE_KEY,
      numOfRows: '100',
      pageNo: String(pageNo),
      itmNm,
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

// 복합제 상표명 제네릭에 흔히 쓰이는 접두어 (성분 무관 — gnlNmCd로 최종 필터링)
// itmNm 전방일치만 지원되므로 상표명 첫 2음절을 넓게 커버.
// 광범위 단일음절(제/다/유 등)은 페이지네이션 폭증으로 제외.
const DEFAULT_DISCOVER_PREFIXES = [
  // 스타틴+에제티미브 복합제(아토젯·로바젯·리토바젯·아토엠젯·이지듀오 등) 계열
  '아토', '아젯', '로바', '로수', '로젯', '리토', '리피', '이지', '듀오',
  '크레', '콜메', '토르', '심바', '스타', '바이', '뉴스', '에제', '제티',
  // 암로디핀+아토르바스타틴 복합제(카듀엣: 아모디핀·암로스타 등) 계열
  '아모', '암로', '카두', '아암', '암아', '카암', '암카', '노바', '바스',
]

// ─────────────────────────────────────────────────────────────────────────────
// 자동 탐색: gnlNmCd 기반 동적 수집 (상표명 복합제 제네릭용)
// itmNm 전방일치로 찾을 수 없는 상표명 제네릭을 찾기 위해
//  1) 필터 없는 전체 조회 지원 시: 전체 DB 페이지네이션 후 gnlNmCd 필터
//  2) 미지원 시: 상표명 접두어 확장 검색 후 gnlNmCd 필터
// gnlNmCd(성분코드)로 최종 필터링하므로 접두어에 다른 성분이 섞여도 자동 제외됨
// ─────────────────────────────────────────────────────────────────────────────
async function autoDiscoverByIngCodes(ingCodeToSpec, allBrandEdis, existingByEdi, prefixes = DEFAULT_DISCOVER_PREFIXES) {
  const ingCodeSet = new Set(Object.keys(ingCodeToSpec))
  const found = new Map()

  const collect = (items) => {
    for (const item of items) {
      const gnlNmCd = item.gnlNmCd?.trim()
      const mdsCd = item.mdsCd?.trim()
      if (gnlNmCd && ingCodeSet.has(gnlNmCd) && mdsCd
          && !allBrandEdis.has(mdsCd) && !existingByEdi.has(mdsCd)) {
        found.set(mdsCd, item)
      }
    }
  }

  // 먼저 필터 없는 조회로 전체 건수 확인 (API 지원 여부 체크)
  const testUrl = buildUrl({ serviceKey: SERVICE_KEY, numOfRows: '1', pageNo: '1' })
  const { raw: testRaw } = await fetchRaw(testUrl)
  const totalCount = parseInt(extractXmlValue(testRaw, 'totalCount') || '0')

  if (totalCount > 0) {
    // 전체 DB 페이지네이션 스캔
    process.stdout.write(`  [autoDiscover] 전체 DB ${totalCount}건 스캔 중... `)
    const pages = Math.ceil(totalCount / 100)
    for (let page = 1; page <= pages; page++) {
      const { raw } = await fetchRaw(buildUrl({ serviceKey: SERVICE_KEY, numOfRows: '100', pageNo: String(page) }))
      const items = parseXmlItems(raw)
      collect(items)
      if (items.length < 100) break
      await sleep(200)
    }
    console.log(`${found.size}건 발견`)
  } else {
    // 필터 없는 조회 미지원 → 상표명 접두어 확장 검색으로 폴백
    process.stdout.write(`  [autoDiscover] 접두어 ${prefixes.length}종 확장 검색... `)
    for (const prefix of prefixes) {
      collect(await fetchAllByItmNm(prefix))
      await sleep(200)
    }
    console.log(`${found.size}건 발견`)
  }

  return [...found.values()]
}

// ─────────────────────────────────────────────────────────────────────────────
// 메인 로직
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== HIRA 약가 데이터 자동 업데이트 ===\n')
  console.log('서비스: dgamtCrtrInfoService1.2/getDgamtList\n')

  // ── 1. 브랜드 약가 조회
  console.log('■ 브랜드 약가 조회 (mdsCd=EDI코드)')
  const brandPrices = {}
  const confirmedIngCodes = {}
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

  // ── 3. 제네릭 약가 조회
  // genericEdis가 있는 규격: mdsCd 직접 조회 (상표명 제네릭 포함)
  // genericEdis가 없는 규격: itmNm 전방일치 검색 + gnlNmCd 분류
  console.log('\n■ 제네릭 약가 조회')
  const genericData = {}
  let genericFetched = 0
  const itmNmCache = {}

  for (const [drugId, { itmNmQuery, ingredientFilter, autoDiscover, discoverPrefixes, specs }] of Object.entries(DRUG_CONFIGS)) {
    const allBrandEdis = new Set(specs.map(s => s.brandEdi).filter(Boolean))
    const ingCodeToSpec = {}
    for (const { specKey } of specs) {
      const ingCode = confirmedIngCodes[drugId]?.[specKey]
      if (ingCode) ingCodeToSpec[ingCode] = specKey
    }

    // EDI 기준 dedup 맵: edi → { productName, manufacturer, specKey, insurancePrice }
    const allByEdi = new Map()

    // ── Step A: itmNm 전방일치 검색 (INN명으로 시작하는 제네릭 수집)
    if (itmNmQuery) {
      const queries = Array.isArray(itmNmQuery) ? itmNmQuery : [itmNmQuery]
      process.stdout.write(`  [itmNm] ${drugId} (${queries.join('+')})... `)

      const itemsByEdi = new Map()
      for (const q of queries) {
        if (!itmNmCache[q]) itmNmCache[q] = await fetchAllByItmNm(q)
        for (const item of itmNmCache[q]) {
          if (item.mdsCd && !itemsByEdi.has(item.mdsCd)) itemsByEdi.set(item.mdsCd, item)
        }
      }
      const itmNmItems = [...itemsByEdi.values()]
      console.log(`${itmNmItems.length}건`)

      for (const item of itmNmItems) {
        const parsed = parseItem(item)
        if (allBrandEdis.has(parsed.ediCode) || parsed.price === 0) continue

        let specKey = ingCodeToSpec[parsed.ingCode]

        if (!specKey && ingredientFilter) {
          const rawName = (item.itmNm ?? '')
          if (ingredientFilter.every(kw => rawName.includes(kw))) {
            const doseStr = parseDoseFromName(parsed.productName)
            if (doseStr) {
              const [d1, d2] = doseStr.replace('mg', '').split('/')
              const candidates = [`${d1}/${d2}mg`, `${d2}/${d1}mg`]
              for (const { specKey: sk } of specs) {
                if (candidates.includes(sk)) { specKey = sk; break }
              }
            }
          }
        }

        if (!specKey) continue
        allByEdi.set(parsed.ediCode, {
          productName: parsed.productName,
          manufacturer: parsed.manufacturer,
          specKey,
          insurancePrice: parsed.price,
        })
      }
    }

    // ── Step B: genericEdis mdsCd 직접 조회 (상표명 제네릭 수집)
    const specsWithEdis = specs.filter(s => s.genericEdis?.length > 0)
    if (specsWithEdis.length > 0) {
      let newCount = 0
      for (const { specKey, genericEdis } of specsWithEdis) {
        for (const edi of genericEdis) {
          if (allBrandEdis.has(edi) || allByEdi.has(edi)) continue
          const { item } = await fetchByMdsCd(edi)
          if (!item) { await sleep(100); continue }
          const parsed = parseItem(item)
          if (parsed.price > 0) {
            allByEdi.set(edi, {
              productName: parsed.productName,
              manufacturer: parsed.manufacturer,
              specKey,
              insurancePrice: parsed.price,
            })
            newCount++
          }
          await sleep(100)
        }
      }
      console.log(`  [genericEdis] ${drugId}: ${newCount}건 추가`)
    }

    // ── Step C: autoDiscover — gnlNmCd 기반 동적 수집 (복합제 상표명 제네릭)
    if (autoDiscover) {
      const discovered = await autoDiscoverByIngCodes(ingCodeToSpec, allBrandEdis, allByEdi, discoverPrefixes)
      let newCount = 0
      for (const item of discovered) {
        const parsed = parseItem(item)
        if (parsed.price === 0) continue
        const specKey = ingCodeToSpec[parsed.ingCode]
        if (!specKey) continue
        allByEdi.set(parsed.ediCode, {
          productName: parsed.productName,
          manufacturer: parsed.manufacturer,
          specKey,
          insurancePrice: parsed.price,
        })
        newCount++
      }
      if (newCount > 0) console.log(`  [autoDiscover] ${drugId}: ${newCount}건 추가`)
    }

    // ── 규격별 그룹화 및 정렬
    const specGroups = {}
    for (const [, entry] of allByEdi) {
      const { specKey, ...rest } = entry
      if (!specGroups[specKey]) specGroups[specKey] = []
      specGroups[specKey].push({ ...rest, specKey })
    }

    for (const specKey of Object.keys(specGroups)) {
      specGroups[specKey].sort((a, b) => a.insurancePrice - b.insurancePrice)
      genericFetched += specGroups[specKey].length
      console.log(`    ${specKey}: ${specGroups[specKey].length}개`)
    }

    genericData[drugId] = specGroups
  }

  // ── 4. allGenerics.js 재생성
  console.log('\n■ allGenerics.js 재생성')
  const today = new Date().toISOString().slice(0, 10)
  let genericsContent = `// 자동 생성 — fetch-hira-prices.js (${today})\nconst allGenerics = {\n`

  for (const [drugId, specGroups] of Object.entries(genericData)) {
    if (Object.keys(specGroups).length === 0) continue
    genericsContent += `  "${drugId}": [\n`
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
