import React, { useState, useMemo } from 'react'
import allGenerics from '../data/allGenerics.js'

const GENERIC_DEFAULT_LIMIT = 10

function fmt(n) {
  return n.toLocaleString('ko-KR') + '원'
}

function PriceBar({ value, max, color }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div style={{ minWidth: 100 }}>
      <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: color,
          borderRadius: 4,
          transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  )
}

function TableSection({ title, icon, color, children, count, controls, hint }) {
  return (
    <div style={{
      background: 'var(--surface)',
      borderRadius: 'var(--radius)',
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-sm)',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '14px 20px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface-2)',
        flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: 14 }}>{title}</span>
        <span style={{
          padding: '2px 8px',
          background: color + '22',
          color,
          borderRadius: 10,
          fontSize: 12,
          fontWeight: 700,
        }}>{count}품목</span>
        {hint && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>
            💡 {hint}
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {controls}
        </div>
      </div>
      {children}
    </div>
  )
}

function Th({ children, sortKey, currentSort, onSort, style }) {
  const active = currentSort?.key === sortKey
  return (
    <th
      onClick={sortKey ? () => onSort(sortKey) : undefined}
      style={{
        padding: '10px 14px',
        textAlign: 'left',
        fontSize: 12,
        fontWeight: 600,
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        whiteSpace: 'nowrap',
        cursor: sortKey ? 'pointer' : 'default',
        userSelect: 'none',
        background: active ? '#f8fafc' : 'transparent',
        ...style,
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {children}
        {sortKey && (
          <span style={{ fontSize: 10, opacity: active ? 1 : 0.4 }}>
            {active ? (currentSort.dir === 'asc' ? '▲' : '▼') : '↕'}
          </span>
        )}
      </span>
    </th>
  )
}

function Td({ children, style }) {
  return (
    <td style={{
      padding: '11px 14px',
      fontSize: 13,
      color: 'var(--text-primary)',
      borderBottom: '1px solid var(--border)',
      ...style,
    }}>{children}</td>
  )
}

// ── 경쟁품 테이블 ────────────────────────────────────────────
function CompetitorTable({ drug }) {
  const [sort, setSort] = useState({ key: 'insurancePrice', dir: 'asc' })
  const [filter, setFilter] = useState('')

  const refPrice = drug.prices[0]?.insurancePrice ?? 0
  const maxPrice = Math.max(...drug.competitors.map(c => c.insurancePrice), refPrice)

  const toggleSort = key => setSort(prev =>
    prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }
  )

  const rows = useMemo(() => {
    let list = drug.competitors
    if (filter.trim()) {
      const q = filter.trim().toLowerCase()
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.manufacturer.toLowerCase().includes(q) ||
        c.ingredient.toLowerCase().includes(q) ||
        c.class.toLowerCase().includes(q)
      )
    }
    return [...list].sort((a, b) => {
      let va = a[sort.key], vb = b[sort.key]
      if (typeof va === 'string') va = va.toLowerCase(), vb = vb.toLowerCase()
      if (va < vb) return sort.dir === 'asc' ? -1 : 1
      if (va > vb) return sort.dir === 'asc' ? 1 : -1
      return 0
    })
  }, [drug.competitors, sort, filter])

  return (
    <TableSection
      title="경쟁 오리지널 약품"
      icon="⚔️"
      color={drug.color}
      count={drug.competitors.length}
      controls={
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="제품명·성분·제조사 검색"
          style={{
            padding: '5px 10px',
            borderRadius: 6,
            border: '1px solid var(--border)',
            fontSize: 12,
            width: 180,
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />
      }
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px',
        background: drug.lightColor,
        borderBottom: `1px solid ${drug.color}22`,
        fontSize: 12,
        color: drug.color,
      }}>
        <span>📌</span>
        <span>
          비교 기준: <strong>{drug.name} {drug.prices[0]?.spec}</strong>{' '}
          보험급여가 <strong>{fmt(refPrice)}</strong> (최저 규격)
        </span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface-2)', borderBottom: '2px solid var(--border)' }}>
              <Th sortKey="name" currentSort={sort} onSort={toggleSort}>제품명</Th>
              <Th sortKey="manufacturer" currentSort={sort} onSort={toggleSort}>제조사</Th>
              <Th>성분명</Th>
              <Th sortKey="class" currentSort={sort} onSort={toggleSort}>약효 분류</Th>
              <Th sortKey="insurancePrice" currentSort={sort} onSort={toggleSort}>보험급여가</Th>
              <Th>우리 제품 대비</Th>
              <Th style={{ minWidth: 110 }}>가격 바</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  검색 결과가 없습니다
                </td>
              </tr>
            ) : rows.map((c, i) => {
              const diff = c.insurancePrice - refPrice
              const diffPct = refPrice ? ((Math.abs(diff) / refPrice) * 100).toFixed(0) : 0
              const isHigher = diff > 0
              const isSame = diff === 0
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)' }}>
                  <Td><span style={{ fontWeight: 600 }}>{c.name}</span></Td>
                  <Td style={{ color: 'var(--text-secondary)' }}>{c.manufacturer}</Td>
                  <Td>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      background: '#f1f5f9',
                      borderRadius: 10,
                      fontSize: 11,
                      color: 'var(--text-secondary)',
                    }}>{c.ingredient}</span>
                  </Td>
                  <Td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{c.class}</Td>
                  <Td>
                    <span style={{
                      fontWeight: 700,
                      fontSize: 15,
                      color: isHigher ? '#b45309' : isSame ? 'var(--text-secondary)' : '#0f766e',
                    }}>
                      {fmt(c.insurancePrice)}
                    </span>
                  </Td>
                  <Td>
                    {isSame ? (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>동일</span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 10,
                          fontSize: 12,
                          fontWeight: 700,
                          background: isHigher ? '#fef3c7' : '#dcfce7',
                          color: isHigher ? '#92400e' : '#166534',
                        }}>
                          {isHigher ? '▲' : '▼'} {diffPct}%
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {isHigher ? '+' : '-'}{Math.abs(diff).toLocaleString()}원 차이
                        </span>
                      </div>
                    )}
                  </Td>
                  <Td>
                    <PriceBar value={c.insurancePrice} max={maxPrice} color={drug.color} />
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </TableSection>
  )
}

const SALT_FORM_META = {
  besylate:    { label: '베실산염', bg: '#f1f5f9', color: '#475569' },
  maleate:     { label: '말레이트', bg: '#eff6ff', color: '#1d4ed8' },
  's-amlodipine': { label: 'S형 (에스암로디핀)', bg: '#f0fdf4', color: '#166534' },
}

function saltFormFromName(name) {
  const n = (name ?? '').toLowerCase()
  if (n.includes('에스암로') || n.startsWith('에스')) return 's-amlodipine'
  if (n.includes('말레')) return 'maleate'
  if (n.includes('베실')) return 'besylate'
  return null
}

function SaltBadge({ g }) {
  const form = g.saltForm ?? saltFormFromName(g.productName ?? g.name)
  if (!form) return null
  const m = SALT_FORM_META[form]
  if (!m) return null
  return (
    <span style={{
      display: 'inline-block',
      padding: '1px 6px',
      borderRadius: 8,
      fontSize: 10,
      fontWeight: 600,
      background: m.bg,
      color: m.color,
      marginTop: 3,
      flexShrink: 0,
    }}>{m.label}</span>
  )
}

// S형 specKey → 동등 용량 비교 기준 specKey
const S_EQUIV = { 'S형-2.5mg': '5mg', 'S형-5mg': '10mg' }

// ── 제네릭 테이블 ────────────────────────────────────────────
function GenericTable({ drug }) {
  const [sort, setSort] = useState({ key: 'insurancePrice', dir: 'asc' })
  const [filter, setFilter] = useState('')
  const [specFilter, setSpecFilter] = useState('all')
  const [showAll, setShowAll] = useState(false)

  // specKey 기준으로 규격 목록 구성
  const specs = useMemo(() => {
    const set = new Set(drug.generics.map(g => g.specKey).filter(Boolean))
    return ['all', ...Array.from(set)]
  }, [drug.generics])

  // specKey로 오리지널 가격 조회
  const priceBySpec = useMemo(() => {
    const map = {}
    drug.prices.forEach(p => { map[p.spec] = p.insurancePrice })
    return map
  }, [drug.prices])

  const maxPrice = Math.max(
    ...drug.generics.map(g => g.insurancePrice),
    ...drug.prices.map(p => p.insurancePrice),
  )

  const toggleSort = key => setSort(prev =>
    prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }
  )

  const isSearching = filter.trim() !== ''

  // 전체 HIRA DB (검색용) — 큐레이션 항목도 포함하여 검색 누락 방지
  const fullList = useMemo(() => {
    const hiList = allGenerics[drug.id] ?? []
    const hiNames = new Set(hiList.map(g => g.productName))
    const extra = drug.generics.filter(g => !hiNames.has(g.productName ?? g.name))
    return [...extra, ...hiList]
  }, [drug.id, drug.generics])

  // 전체 목록 (정렬+필터 적용)
  const allRows = useMemo(() => {
    const q = filter.trim().toLowerCase()
    let list
    if (q) {
      // 검색 중: HIRA 전체 DB 검색, 규격 필터 무시
      list = fullList.filter(g =>
        g.productName.toLowerCase().includes(q) ||
        g.manufacturer.toLowerCase().includes(q)
      )
    } else {
      // 기본: 큐레이션 목록, 규격 필터 적용
      list = drug.generics
      if (specFilter !== 'all') {
        list = list.filter(g => g.specKey === specFilter)
      }
    }
    return [...list].sort((a, b) => {
      let va = sort.key === 'name' ? (a.productName ?? a.name) : a[sort.key]
      let vb = sort.key === 'name' ? (b.productName ?? b.name) : b[sort.key]
      if (typeof va === 'string') va = va.toLowerCase(), vb = vb.toLowerCase()
      if (va < vb) return sort.dir === 'asc' ? -1 : 1
      if (va > vb) return sort.dir === 'asc' ? 1 : -1
      return 0
    })
  }, [drug.generics, fullList, sort, filter, specFilter])

  // 검색 중이면 전체, 아니면 10개 (또는 더보기 클릭 시 전체)
  const displayRows = (isSearching || showAll) ? allRows : allRows.slice(0, GENERIC_DEFAULT_LIMIT)
  const hasMore = !isSearching && !showAll && allRows.length > GENERIC_DEFAULT_LIMIT

  return (
    <TableSection
      title="주요 제네릭 의약품"
      icon="🏭"
      color="#0f766e"
      count={drug.generics.length}
      hint="검색을 이용하시면 제네릭 전 제품 검색이 가능합니다"
      controls={
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {specs.length > 2 && (
            <select
              value={specFilter}
              onChange={e => { setSpecFilter(e.target.value); setShowAll(false) }}
              style={{
                padding: '5px 8px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                fontSize: 12,
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              <option value="all">전체 규격</option>
              {specs.filter(s => s !== 'all').map(s => (
                <option key={s} value={s}>
                  {s === 'S형-2.5mg' ? 'S형 2.5mg (암로디핀 5mg 상당)' :
                   s === 'S형-5mg'   ? 'S형 5mg (암로디핀 10mg 상당)' : s}
                </option>
              ))}
            </select>
          )}
          <input
            value={filter}
            onChange={e => { setFilter(e.target.value); setShowAll(false) }}
            placeholder="전체 제네릭 검색"
            style={{
              padding: '5px 10px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              fontSize: 12,
              width: 160,
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>
      }
    >
      {/* 상태 배너 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px',
        background: isSearching ? '#eff6ff' : '#f0fdf4',
        borderBottom: `1px solid ${isSearching ? '#bfdbfe' : '#bbf7d0'}`,
        fontSize: 12,
        color: isSearching ? '#1d4ed8' : '#166534',
        flexWrap: 'wrap',
      }}>
        {isSearching ? (
          <>
            <span>🔍</span>
            <span>
              동일성분 전체 {fullList.length}품목 중 <strong>{allRows.length}개</strong> 검색됨
            </span>
          </>
        ) : (
          <>
            <span>✅</span>
            <span>
              전체 <strong>{drug.generics.length}품목</strong> 중 주요 <strong>{Math.min(GENERIC_DEFAULT_LIMIT, allRows.length)}품목</strong> 표시
              {allRows.length > GENERIC_DEFAULT_LIMIT && !showAll && (
                <> — 나머지 {allRows.length - GENERIC_DEFAULT_LIMIT}품목은 검색하거나 더 보기를 클릭하세요</>
              )}
            </span>
          </>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface-2)', borderBottom: '2px solid var(--border)' }}>
              <Th sortKey="name" currentSort={sort} onSort={toggleSort}>제품명</Th>
              <Th sortKey="manufacturer" currentSort={sort} onSort={toggleSort}>제조사</Th>
              <Th sortKey="approvalDate" currentSort={sort} onSort={toggleSort}>허가일</Th>
              <Th sortKey="insurancePrice" currentSort={sort} onSort={toggleSort}>보험급여가</Th>
              <Th>우리 제품 대비 차액</Th>
              <Th style={{ minWidth: 110 }}>가격 바</Th>
            </tr>
          </thead>
          <tbody>
            {displayRows.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  검색 결과가 없습니다
                </td>
              </tr>
            ) : displayRows.map((g, i) => {
              const equivSpec = S_EQUIV[g.specKey]
              const refSpec = equivSpec ?? g.specKey
              const origPrice = refSpec ? priceBySpec[refSpec] : drug.prices[0]?.insurancePrice
              const saving = origPrice != null ? origPrice - g.insurancePrice : null
              const savingPct = (origPrice && saving != null) ? Math.round(Math.abs(saving) / origPrice * 100) : null

              return (
                <tr key={i} style={{ background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)' }}>
                  <Td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontWeight: 700 }}>{g.productName ?? g.name}</span>
                      {g.name && g.name !== g.productName && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{g.name}</span>
                      )}
                      <SaltBadge g={g} />
                    </div>
                  </Td>
                  <Td style={{ color: 'var(--text-secondary)' }}>{g.manufacturer}</Td>
                  <Td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{g.approvalDate ?? '-'}</Td>
                  <Td>
                    <span style={{ fontWeight: 700, fontSize: 15, color: '#0f766e' }}>
                      {fmt(g.insurancePrice)}
                    </span>
                  </Td>
                  <Td>
                    {saving != null ? (
                      saving === 0 ? (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>동일</span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {drug.name} {refSpec}{equivSpec ? ` (S형 ${g.specKey} 상당)` : ''}: {fmt(origPrice)}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: 10,
                              fontSize: 12,
                              fontWeight: 700,
                              background: saving > 0 ? '#dcfce7' : '#fff7ed',
                              color: saving > 0 ? '#166534' : '#ea580c',
                            }}>
                              {saving > 0 ? '▼' : '▲'} {Math.abs(savingPct)}%
                            </span>
                            <span style={{ fontWeight: 600, color: saving > 0 ? '#0369a1' : '#ea580c', fontSize: 13 }}>
                              {saving > 0 ? `-${saving.toLocaleString()}원` : `+${Math.abs(saving).toLocaleString()}원`}
                            </span>
                          </div>
                        </div>
                      )
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>-</span>
                    )}
                  </Td>
                  <Td>
                    <PriceBar value={g.insurancePrice} max={maxPrice} color="#10b981" />
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 더 보기 / 접기 */}
      {(hasMore || (showAll && allRows.length > GENERIC_DEFAULT_LIMIT && !isSearching)) && (
        <div style={{
          textAlign: 'center',
          padding: '12px',
          borderTop: '1px solid var(--border)',
          background: 'var(--surface-2)',
        }}>
          <button
            onClick={() => setShowAll(v => !v)}
            style={{
              padding: '6px 20px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text-secondary)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {showAll
              ? `▲ 접기 (상위 ${GENERIC_DEFAULT_LIMIT}개만 보기)`
              : `▼ 더 보기 (${allRows.length - GENERIC_DEFAULT_LIMIT}개 더)`}
          </button>
        </div>
      )}
    </TableSection>
  )
}

// ── 메인 컴포넌트 ────────────────────────────────────────────
export default function CompetitorSection({ drug }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <CompetitorTable drug={drug} />
      <GenericTable drug={drug} />
    </div>
  )
}
