#!/usr/bin/env node
/**
 * 식약처 API에서 전 품목 허가사항 원문을 가져와 stdout으로 출력합니다.
 * GitHub Actions 로그에서 확인용.
 */

import https from 'https'

const SERVICE_KEY = process.env.DATA_GO_KR_KEY || process.argv[2]
if (!SERVICE_KEY) {
  console.error('❌ DATA_GO_KR_KEY 환경변수 필요')
  process.exit(1)
}

const DRUGS = [
  { id: 'lipitor',      keyword: '리피토정',      cmpName: '비아트리스' },
  { id: 'lipitor-plus', keyword: '리피토플러스정', cmpName: '비아트리스' },
  { id: 'norvasc',      keyword: '노바스크정',     cmpName: '비아트리스' },
  { id: 'lyrica',       keyword: '리리카캡슐',     cmpName: '비아트리스' },
  { id: 'celebrex',     keyword: '쎄레브렉스캡슐', cmpName: '비아트리스' },
  { id: 'caduet',       keyword: '카듀엣정',       cmpName: '비아트리스' },
]

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = ''
      res.on('data', c => { data += c })
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`))
        try { resolve(JSON.parse(data)) }
        catch { reject(new Error(`JSON 파싱 실패: ${data.slice(0, 200)}`)) }
      })
    }).on('error', reject)
  })
}

async function search(keyword, cmpName) {
  const base = 'https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService04/getDrugPrdtPrmsnDtlInq05'
  const k = encodeURIComponent(SERVICE_KEY)

  for (const extra of [`&cmpName=${encodeURIComponent(cmpName)}`, '']) {
    const url = `${base}?serviceKey=${k}&itemName=${encodeURIComponent(keyword)}${extra}&type=json&numOfRows=5&pageNo=1`
    const json = await fetchJson(url)
    const items = json?.body?.items
    if (items && !(Array.isArray(items) && items.length === 0)) {
      return Array.isArray(items) ? items[0] : items.item
    }
  }
  return null
}

function htmlToText(html) {
  if (!html) return ''
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n').replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/li>/gi, '\n').replace(/<li[^>]*>/gi, '\n')
    .replace(/<\/tr>/gi, '\n').replace(/<tr[^>]*>/gi, '\n')
    .replace(/<\/td>/gi, '  ').replace(/<\/th>/gi, '  ')
    .replace(/<\/div>/gi, '\n').replace(/<\/section>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ').replace(/&#160;/g, ' ')
    .replace(/&#[0-9]+;/g, '').replace(/&[a-z]+;/g, ' ')
    .split('\n').map(l => l.replace(/\s+/g, ' ').trim())
    .filter(l => l.length > 0)
    .join('\n')
}

const SEP = '='.repeat(80)
const SEP2 = '-'.repeat(60)

async function main() {
  for (const drug of DRUGS) {
    process.stdout.write(`\n${SEP}\n`)
    process.stdout.write(`[${drug.id}] ${drug.keyword} 조회 중...\n`)

    try {
      const item = await search(drug.keyword, drug.cmpName)
      if (!item) {
        console.log('❌ 결과 없음')
        continue
      }

      console.log(`✅ 품목명: ${item.ITEM_NAME}`)
      console.log(`   품목기준코드: ${item.ITEM_SEQ}`)
      console.log(`   업체명: ${item.ENTP_NAME}`)

      console.log(`\n${SEP2}`)
      console.log('【 효능효과 (EE_DOC_DATA) 】')
      console.log(SEP2)
      console.log(htmlToText(item.EE_DOC_DATA))

      console.log(`\n${SEP2}`)
      console.log('【 용법용량 (UD_DOC_DATA) 】')
      console.log(SEP2)
      console.log(htmlToText(item.UD_DOC_DATA))

      console.log(`\n${SEP2}`)
      console.log('【 사용상의 주의사항 (NB_DOC_DATA) 】')
      console.log(SEP2)
      console.log(htmlToText(item.NB_DOC_DATA))

    } catch (e) {
      console.log(`❌ 오류: ${e.message}`)
    }
  }
  console.log(`\n${SEP}`)
  console.log('완료')
}

main().catch(e => { console.error(e.message); process.exit(1) })
