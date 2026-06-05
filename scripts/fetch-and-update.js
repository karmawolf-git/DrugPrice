#!/usr/bin/env node
/**
 * 식약처 API에서 원문을 가져와 drugs.js에 직접 반영합니다.
 * GitHub Actions에서 실행.
 */

import https from 'https'
import http from 'http'
import fs from 'fs'

const SERVICE_KEY = process.env.DATA_GO_KR_KEY || process.argv[2]
if (!SERVICE_KEY) {
  console.error('❌ DATA_GO_KR_KEY 환경변수 필요')
  process.exit(1)
}

const DRUGS = [
  { id: 'lipitor',      keyword: '리피토정',       cmpName: '비아트리스' },
  { id: 'lipitor-plus', keyword: '리피토플러스정',  cmpName: '비아트리스' },
  { id: 'norvasc',      keyword: '노바스크정',       cmpName: '비아트리스' },
  { id: 'lyrica',       keyword: '리리카캡슐',       cmpName: '비아트리스' },
  { id: 'celebrex',     keyword: '쎄레브렉스캡슐',   cmpName: '비아트리스' },
  { id: 'caduet',       keyword: '카듀엣정',         cmpName: '비아트리스' },
]

function fetchRaw(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http
    const req = lib.get(url, { headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'application/json, text/plain, */*',
    }}, (res) => {
      let data = ''
      res.on('data', c => { data += c })
      res.on('end', () => resolve({ status: res.statusCode, body: data }))
    })
    req.on('error', reject)
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')) })
  })
}

async function tryEndpoint(base, params) {
  const qs = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&')
  const url = `${base}?${qs}`
  const { status, body } = await fetchRaw(url)
  return { status, body, url }
}

async function searchDrug(keyword, cmpName) {
  const bases = [
    'https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService04/getDrugPrdtPrmsnDtlInq05',
    'https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService04/getDrugPrdtPrmsnDtlInq04',
    'https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService03/getDrugPrdtPrmsnDtlInq05',
  ]
  const extras = [{ cmpName }, {}]

  for (const base of bases) {
    for (const extra of extras) {
      const params = {
        serviceKey: SERVICE_KEY,
        itemName: keyword,
        type: 'json',
        numOfRows: '5',
        pageNo: '1',
        ...extra,
      }
      const { status, body, url } = await tryEndpoint(base, params)
      const ep = base.split('/').slice(-2).join('/')

      if (status !== 200) {
        console.log(`  [${ep}] HTTP ${status}: ${body.slice(0, 200)}`)
        continue
      }

      let json
      try { json = JSON.parse(body) } catch {
        console.log(`  [${ep}] JSON 파싱 실패: ${body.slice(0, 100)}`)
        continue
      }

      const items = json?.body?.items
      if (!items || (Array.isArray(items) && items.length === 0)) {
        console.log(`  [${ep}] 결과 없음`)
        continue
      }

      const item = Array.isArray(items) ? items[0] : items.item
      console.log(`  ✅ [${ep}] ${item.ITEM_NAME}`)
      return item
    }
  }
  return null
}

// HTML → 텍스트 줄 배열 (원문 그대로, 필터링 없음)
function htmlToLines(html) {
  if (!html) return []
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n').replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/li>/gi, '\n').replace(/<li[^>]*>/gi, '\n')
    .replace(/<\/tr>/gi, '\n').replace(/<tr[^>]*>/gi, '\n')
    .replace(/<\/td>/gi, '  ').replace(/<\/th>/gi, '  ')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ').replace(/&#160;/g, ' ')
    .replace(/&#[0-9]+;/g, '').replace(/&[a-z]+;/g, ' ')
    .split('\n')
    .map(l => l.replace(/\s+/g, ' ').trim())
    .filter(l => l.length > 0)
}

// drugs.js 내 배열 교체
function findArrayEnd(text, i) {
  let depth = 1, inStr = false, strCh = '', esc = false
  i++
  while (i < text.length && depth > 0) {
    const c = text[i]
    if (esc) { esc = false }
    else if (c === '\\' && inStr) { esc = true }
    else if (inStr) { if (c === strCh) inStr = false }
    else if (c === "'" || c === '"' || c === '`') { inStr = true; strCh = c }
    else if (c === '[') depth++
    else if (c === ']') depth--
    i++
  }
  return i
}

function replaceField(src, drugId, field, items) {
  const idPat = new RegExp(`id:\\s*['"]${drugId.replace('-', '\\-')}['"]`)
  const drugStart = src.search(idPat)
  if (drugStart === -1) return src

  const rest = src.slice(drugStart + 10)
  const nextDrug = rest.search(/\n\s*\{\s*\n\s*id:/)
  const drugEnd = nextDrug === -1 ? src.length : drugStart + 10 + nextDrug

  const section = src.slice(drugStart, drugEnd)
  const fPat = new RegExp(`\\b${field}:\\s*\\[`)
  const fMatch = section.search(fPat)
  if (fMatch === -1) return src

  const absStart = drugStart + fMatch
  const openIdx = src.indexOf('[', absStart)
  const closeIdx = findArrayEnd(src, openIdx)

  const lines = items
    .map(l => `      '${l.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, ' ')}',`)
    .join('\n')

  return src.slice(0, openIdx + 1) + '\n' + lines + '\n    ' + src.slice(closeIdx - 1)
}

async function main() {
  console.log('=== 식약처 허가사항 원문 조회 ===\n')

  const SEP = '─'.repeat(60)
  let src = fs.readFileSync('./src/data/drugs.js', 'utf-8')
  let updated = 0

  for (const drug of DRUGS) {
    console.log(`\n${SEP}`)
    console.log(`[${drug.id}] ${drug.keyword}`)

    const item = await searchDrug(drug.keyword, drug.cmpName)
    if (!item) {
      console.log('❌ 데이터 없음')
      continue
    }

    const ee = htmlToLines(item.EE_DOC_DATA)
    const ud = htmlToLines(item.UD_DOC_DATA)
    const nb = htmlToLines(item.NB_DOC_DATA)

    console.log(`\n[효능효과] ${ee.length}줄`)
    ee.forEach(l => console.log('  ' + l))
    console.log(`\n[용법용량] ${ud.length}줄`)
    ud.forEach(l => console.log('  ' + l))
    console.log(`\n[주의사항] ${nb.length}줄 (처음 10줄)`)
    nb.slice(0, 10).forEach(l => console.log('  ' + l))
    if (nb.length > 10) console.log(`  ... 외 ${nb.length - 10}줄`)

    if (ee.length) src = replaceField(src, drug.id, 'indications', ee)
    if (ud.length) src = replaceField(src, drug.id, 'dosage', ud)
    if (nb.length) src = replaceField(src, drug.id, 'cautions', nb)
    updated++
  }

  if (updated > 0) {
    fs.writeFileSync('./src/data/drugs.js', src, 'utf-8')
    console.log(`\n\n✅ drugs.js 업데이트 완료 (${updated}개 약품)`)
  } else {
    console.log('\n\n❌ 업데이트 실패 — API 연결 문제 확인 필요')
    process.exit(1)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
