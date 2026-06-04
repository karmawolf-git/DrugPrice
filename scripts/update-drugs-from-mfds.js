/**
 * mfds-drug-data.json을 읽어 drugs.js의 indications/dosage/cautions를 업데이트합니다.
 */

import { readFileSync, writeFileSync } from 'fs'

const data = JSON.parse(readFileSync('./scripts/mfds-drug-data.json', 'utf-8'))

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

// 배열의 정확한 시작·끝 위치를 파싱 (중첩 괄호·문자열 대응)
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
  return i // ] 다음 위치
}

function replaceField(src, drugId, field, items) {
  // 1. 해당 약품 id 위치 찾기
  const idPattern = new RegExp(`id:\\s*['"]${drugId.replace('-', '\\-')}['"]`)
  const drugStart = src.search(idPattern)
  if (drugStart === -1) {
    console.warn(`  ⚠️  [${drugId}] id 찾기 실패`)
    return src
  }

  // 2. 다음 약품 시작 위치 (범위 제한)
  const rest = src.slice(drugStart + 10)
  const nextMatch = rest.search(/\n\s*\{\s*\n\s*id:/)
  const drugEnd = nextMatch === -1 ? src.length : drugStart + 10 + nextMatch

  // 3. 해당 필드의 [ 위치 찾기
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

  // , 이후의 공백까지 포함 (],\n)
  let afterClose = closePos
  while (afterClose < src.length && (src[afterClose] === ',' || src[afterClose] === '\n' || src[afterClose] === '\r')) {
    if (src[afterClose] === '\n') { afterClose++; break }
    afterClose++
  }

  const indent = '      '
  const newArray = items
    .map(item => `${indent}'${item.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, ' ')}',`)
    .join('\n')

  const before = src.slice(0, openBracket + 1)
  const after = src.slice(closePos - 1) // ] 포함
  return `${before}\n${newArray}\n    ${after}`
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

  const indications = stripHtml(d.eeDocData)
  const dosage      = stripHtml(d.udDocData)
  const cautions    = stripHtml(d.nbDocData)

  if (indications.length) src = replaceField(src, drugId, 'indications', indications)
  if (dosage.length)      src = replaceField(src, drugId, 'dosage', dosage)
  if (cautions.length)    src = replaceField(src, drugId, 'cautions', cautions)

  console.log(`✅ [${drugId}] 효능효과 ${indications.length}항목 / 용법용량 ${dosage.length}항목 / 주의사항 ${cautions.length}항목`)
  updated++
}

if (updated > 0) {
  writeFileSync('./src/data/drugs.js', src, 'utf-8')
  console.log('\n✅ src/data/drugs.js 업데이트 완료')
} else {
  console.log('\n⚠️  업데이트된 약품 없음')
  process.exit(1)
}
