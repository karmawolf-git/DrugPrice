#!/usr/bin/env node
/**
 * 식품의약품안전처 공공 API를 통해 6개 약품의 허가사항 원문을 가져옵니다.
 *
 * === API 키 발급 방법 ===
 * 1. https://www.data.go.kr 접속 → 회원가입
 * 2. 검색창에 "의약품허가정보서비스" 검색
 * 3. [의약품 허가정보 서비스(의약품 품목허가·신고·심사 정보)] → "활용신청"
 * 4. 신청 즉시 발급 (일반 인증키 사용)
 * 5. 마이페이지 → 인증키 확인 (URL 인코딩된 키 사용)
 *
 * === 실행 방법 ===
 * node scripts/fetch-mfds-data.js <YOUR_API_KEY>
 * 또는: DATA_GO_KR_KEY=<YOUR_API_KEY> node scripts/fetch-mfds-data.js
 */

import https from 'https'
import fs from 'fs'

const SERVICE_KEY = process.env.DATA_GO_KR_KEY || process.argv[2]

if (!SERVICE_KEY) {
  console.error('❌ API 키가 필요합니다.')
  console.error('사용법: node scripts/fetch-mfds-data.js <API_KEY>')
  console.error('      또는: DATA_GO_KR_KEY=<API_KEY> node scripts/fetch-mfds-data.js')
  process.exit(1)
}

// 각 약품의 품목명 (식약처 등록 기준 — 조회 결과 없으면 nedrug.mfds.go.kr에서 정확한 품목명 확인)
const DRUG_QUERIES = [
  { id: 'lipitor',      itemName: '리피토정10밀리그램(아토르바스타틴칼슘삼수화물)' },
  { id: 'lipitor-plus', itemName: '리피토플러스정10/10밀리그램(에제티미브/아토르바스타틴칼슘삼수화물)' },
  { id: 'norvasc',      itemName: '노바스크정5mg(암로디핀베실산염)' },
  { id: 'lyrica',       itemName: '리리카캡슐75mg(프레가발린)' },
  { id: 'celebrex',     itemName: '쎄레브렉스캡슐200밀리그램(셀레콕시브)' },
  { id: 'caduet',       itemName: '카듀엣정5/10mg(암로디핀베실산염/아토르바스타틴칼슘삼수화물)' },
]

function fetchDrugInfo(itemName) {
  return new Promise((resolve, reject) => {
    const encodedKey = encodeURIComponent(SERVICE_KEY)
    const encodedName = encodeURIComponent(itemName)
    const url = `https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService04/getDrugPrdtPrmsnDtlInq05?serviceKey=${encodedKey}&itemName=${encodedName}&type=json&numOfRows=5&pageNo=1`

    https.get(url, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          resolve(json)
        } catch (e) {
          reject(new Error(`JSON 파싱 실패 (${itemName}): ${data.substring(0, 300)}`))
        }
      })
    }).on('error', reject)
  })
}

function stripHtml(html) {
  if (!html) return []
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/td>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ').replace(/&#[0-9]+;/g, '').replace(/&[a-z]+;/g, ' ')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 5 && !/^[\d\s.\-()]+$/.test(l))
}

async function main() {
  console.log('🔍 식품의약품안전처 허가사항 원문 조회 중...\n')

  const results = {}

  for (const drug of DRUG_QUERIES) {
    process.stdout.write(`  [${drug.id}] ${drug.itemName} ... `)
    try {
      const json = await fetchDrugInfo(drug.itemName)
      const body = json?.body
      const items = body?.items

      if (!items || (Array.isArray(items) && items.length === 0)) {
        console.log('❌ 결과 없음 — nedrug.mfds.go.kr에서 정확한 품목명 확인 필요')
        results[drug.id] = null
        continue
      }

      const item = Array.isArray(items) ? items[0] : items.item

      results[drug.id] = {
        itemName: item.ITEM_NAME,
        itemSeq: item.ITEM_SEQ,
        eeDocData: item.EE_DOC_DATA,
        udDocData: item.UD_DOC_DATA,
        nbDocData: item.NB_DOC_DATA,
      }

      console.log(`✅ ${item.ITEM_NAME} (${item.ITEM_SEQ})`)
    } catch (e) {
      console.log(`❌ 오류: ${e.message}`)
      results[drug.id] = null
    }
  }

  // 원시 HTML 데이터 저장 (참조용)
  const outputPath = './scripts/mfds-drug-data.json'
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8')
  console.log(`\n📄 원시 데이터 저장 완료: ${outputPath}`)

  console.log('\n========== drugs.js 교체용 출력 ==========\n')

  for (const drug of DRUG_QUERIES) {
    const r = results[drug.id]
    if (!r) {
      console.log(`// ⚠️  [${drug.id}] 데이터 없음 — 품목명 재확인 필요\n`)
      continue
    }

    const indications = stripHtml(r.eeDocData)
    const dosage = stripHtml(r.udDocData)
    const cautions = stripHtml(r.nbDocData)

    console.log(`// ===== ${drug.id} =====`)
    console.log(`// 출처: 식품의약품안전처 의약품통합정보시스템 (품목기준코드: ${r.itemSeq})`)
    console.log(`// 품목명: ${r.itemName}`)

    console.log(`indications: [`)
    indications.forEach(l => console.log(`  '${l.replace(/'/g, "\\'")}',`))
    console.log(`],`)

    console.log(`dosage: [`)
    dosage.forEach(l => console.log(`  '${l.replace(/'/g, "\\'")}',`))
    console.log(`],`)

    console.log(`cautions: [`)
    cautions.forEach(l => console.log(`  '${l.replace(/'/g, "\\'")}',`))
    console.log(`],`)
    console.log()
  }
}

main().catch(e => {
  console.error('실행 오류:', e.message)
  process.exit(1)
})
