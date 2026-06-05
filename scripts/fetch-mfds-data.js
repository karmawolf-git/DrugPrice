#!/usr/bin/env node
/**
 * 식품의약품안전처 공공 API를 통해 6개 약품의 허가사항 원문 HTML을 가져옵니다.
 * 원문 HTML은 EE_DOC_DATA(효능효과), UD_DOC_DATA(용법용량), NB_DOC_DATA(주의사항)에 저장됩니다.
 *
 * === API 키 발급 방법 ===
 * 1. https://www.data.go.kr 접속 → 회원가입
 * 2. "의약품허가정보서비스" 검색 → 활용신청 (즉시 발급)
 * 3. 마이페이지 → 인증키 복사
 *
 * === 실행 방법 ===
 * DATA_GO_KR_KEY=<API_KEY> node scripts/fetch-mfds-data.js
 */

import https from 'https'
import fs from 'fs'

const SERVICE_KEY = process.env.DATA_GO_KR_KEY || process.argv[2]

if (!SERVICE_KEY) {
  console.error('❌ API 키 필요: DATA_GO_KR_KEY=<KEY> node scripts/fetch-mfds-data.js')
  process.exit(1)
}

// 각 약품: 정확한 품목명 검색이 어려우므로 키워드로 검색 후 첫 결과 사용
const DRUG_QUERIES = [
  { id: 'lipitor',      keyword: '리피토정',         cmpName: '비아트리스' },
  { id: 'lipitor-plus', keyword: '리피토플러스정',    cmpName: '비아트리스' },
  { id: 'norvasc',      keyword: '노바스크정',         cmpName: '비아트리스' },
  { id: 'lyrica',       keyword: '리리카캡슐',         cmpName: '비아트리스' },
  { id: 'celebrex',     keyword: '쎄레브렉스캡슐',     cmpName: '비아트리스' },
  { id: 'caduet',       keyword: '카듀엣정',           cmpName: '비아트리스' },
]

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`))
          return
        }
        try { resolve(JSON.parse(data)) }
        catch (e) { reject(new Error(`JSON 파싱 실패: ${data.substring(0, 300)}`)) }
      })
    }).on('error', reject)
  })
}

async function searchDrug({ keyword, cmpName }) {
  const base = 'https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService04/getDrugPrdtPrmsnDtlInq05'
  const key = encodeURIComponent(SERVICE_KEY)

  // 1차: 품목명 + 업체명으로 검색
  const url1 = `${base}?serviceKey=${key}&itemName=${encodeURIComponent(keyword)}&cmpName=${encodeURIComponent(cmpName)}&type=json&numOfRows=5&pageNo=1`
  let json = await fetch(url1)
  let items = json?.body?.items

  // 2차: 품목명만으로 검색 (업체명 없이)
  if (!items || (Array.isArray(items) && items.length === 0)) {
    const url2 = `${base}?serviceKey=${key}&itemName=${encodeURIComponent(keyword)}&type=json&numOfRows=5&pageNo=1`
    json = await fetch(url2)
    items = json?.body?.items
  }

  if (!items || (Array.isArray(items) && items.length === 0)) return null

  const list = Array.isArray(items) ? items : [items.item]
  return list[0]
}

async function main() {
  console.log('🔍 식품의약품안전처 허가사항 원문 조회 중...\n')

  const results = {}

  for (const drug of DRUG_QUERIES) {
    process.stdout.write(`  [${drug.id}] ${drug.keyword} ... `)
    try {
      const item = await searchDrug(drug)

      if (!item) {
        console.log('❌ 결과 없음')
        results[drug.id] = null
        continue
      }

      // 원문 HTML 전체 보존
      results[drug.id] = {
        itemName:   item.ITEM_NAME,
        itemSeq:    item.ITEM_SEQ,
        eeDocData:  item.EE_DOC_DATA,   // 효능효과 원문 HTML
        udDocData:  item.UD_DOC_DATA,   // 용법용량 원문 HTML
        nbDocData:  item.NB_DOC_DATA,   // 주의사항 원문 HTML (매우 긴 문서)
      }

      console.log(`✅ ${item.ITEM_NAME} (코드: ${item.ITEM_SEQ})`)
    } catch (e) {
      console.log(`❌ 오류: ${e.message}`)
      results[drug.id] = null
    }
  }

  fs.writeFileSync('./scripts/mfds-drug-data.json', JSON.stringify(results, null, 2), 'utf-8')
  console.log('\n📄 원문 데이터 저장: scripts/mfds-drug-data.json')

  const ok = Object.values(results).filter(Boolean).length
  const fail = Object.values(results).filter(v => !v).length
  console.log(`   성공 ${ok}개 / 실패 ${fail}개`)

  if (fail > 0) {
    console.log('\n⚠️  실패한 약품은 nedrug.mfds.go.kr에서 정확한 품목명을 확인 후 keyword를 수정하세요.')
  }
}

main().catch(e => {
  console.error('실행 오류:', e.message)
  process.exit(1)
})
