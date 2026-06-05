/**
 * mfds-drug-data.json을 읽어 drugs.js의 indications/dosage/cautions를 업데이트합니다.
 * 식약처 허가사항 원문 HTML을 필터링 없이 그대로 텍스트로 변환합니다.
 */

import { readFileSync, writeFileSync } from 'fs'

const data = JSON.parse(readFileSync('./scripts/mfds-drug-data.json', 'utf-8'))

/**
 * HTML → 원문 텍스트 배열 변환 (필터링 없음)
 * 블록 요소 기준으로 줄 분리, 인라인 태그만 제거
 */
function htmlToLines(html) {
  if (!html) return []

  let text = html
    // 제목 태그 → 줄바꿈 + 마커
    .replace(/<h[1-6][^>]*>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    // 문단
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    // 리스트 항목
    .replace(/<li[^>]*>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    // 줄바꿈
    .replace(/<br\s*\/?>/gi, '\n')
    // 테이블 행
    .replace(/<tr[^>]*>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    // 테이블 셀 구분자
    .replace(/<\/td>/gi, '  ')
    .replace(/<\/th>/gi, '  ')
    // 블록 닫기
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/section>/gi, '\n')
    // 나머지 모든 태그 제거
    .replace(/<[^>]+>/g, '')
    // HTML 엔티티
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#160;/g, ' ')
    .replace(/&#[0-9]+;/g, '')
    .replace(/&[a-z]+;/g, ' ')

  return text
    .split('\n')
    .map(l => l.replace(/\s+/g, ' ').trim())
    .filter(l => l.length > 0) // 빈 줄만 제거, 내용 필터링 없음
}

// 배열의 정확한 끝 위치를 파싱 (중첩 괄호·문자열 대응)
function findArrayEnd(text, openBracketIdx) {
  let i = openBracketIdx + 1
  let depth = 1
  let inString = false
  let stringChar = ''
  let escaped = false

  while (i < text.length && depth > 0) {
    const c = text[i]
    if (escaped) {
      escaped = false
    } else if (c === '\\' && inString) {
      escaped = true
    } else if (inString) {
      if (c === stringChar) inString = false
    } else if (c === "'" || c === '"' || c === '`') {
      inString = true
      stringChar = c
    } else if (c === '[') {
      depth++
    } else if (c === ']') {
      depth--
    }
    i++
  }
  return i
}

function replaceField(src, drugId, field, items) {
  const idPattern = new RegExp(`id:\\s*['"]${drugId.replace('-', '\\-')}['"]`)
  const drugStart = src.search(idPattern)
  if (drugStart === -1) {
    console.warn(`  ⚠️  [${drugId}] id 찾기 실패`)
    return src
  }

  const rest = src.slice(drugStart + 10)
  const nextMatch = rest.search(/\n\s*\{\s*\n\s*id:/)
  const drugEnd = nextMatch === -1 ? src.length : drugStart + 10 + nextMatch

  const drugSection = src.slice(drugStart, drugEnd)
  const fieldPattern = new RegExp(`\\b${field}:\\s*\\[`)
  const fieldMatch = drugSection.search(fieldPattern)
  if (fieldMatch === -1) {
    console.warn(`  ⚠️  [${drugId}] ${field} 찾기 실패`)
    return src
  }

  const absFieldStart = drugStart + fieldMatch
  const openBracket = src.indexOf('[', absFieldStart)
  const closePos = findArrayEnd(src, openBracket)

  const indent = '      '
  const newArray = items
    .map(item => `${indent}'${item.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, ' ')}',`)
    .join('\n')

  return src.slice(0, openBracket + 1) + '\n' + newArray + '\n    ' + src.slice(closePos - 1)
}

let src = readFileSync('./src/data/drugs.js', 'utf-8')
const DRUG_IDS = ['lipitor', 'lipitor-plus', 'norvasc', 'lyrica', 'celebrex', 'caduet']

let updated = 0
for (const drugId of DRUG_IDS) {
  const d = data[drugId]
  if (!d || (!d.eeDocData && !d.udDocData && !d.nbDocData)) {
    console.log(`⚠️  [${drugId}] 데이터 없음 — 건너뜀`)
    continue
  }

  const indications = htmlToLines(d.eeDocData)
  const dosage      = htmlToLines(d.udDocData)
  const cautions    = htmlToLines(d.nbDocData)

  if (indications.length) src = replaceField(src, drugId, 'indications', indications)
  if (dosage.length)      src = replaceField(src, drugId, 'dosage', dosage)
  if (cautions.length)    src = replaceField(src, drugId, 'cautions', cautions)

  console.log(`✅ [${drugId}] 효능효과 ${indications.length}줄 / 용법용량 ${dosage.length}줄 / 주의사항 ${cautions.length}줄`)
  updated++
}

if (updated > 0) {
  writeFileSync('./src/data/drugs.js', src, 'utf-8')
  console.log('\n✅ src/data/drugs.js 업데이트 완료')
} else {
  console.log('\n⚠️  업데이트된 약품 없음')
  process.exit(1)
}
