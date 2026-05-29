import React, { useState, useMemo } from 'react'

function fmt(n) {
  return n.toLocaleString('ko-KR') + '원'
}

function SortButton({ active, dir, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 10px',
        borderRadius: 6,
        border: '1px solid',
        borderColor: active ? 'currentColor' : 'var(--border)',
        background: active ? '#f8fafc' : 'transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-muted)',
        fontSize: 12,
        fontWeight: active ? 600 : 400,
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {children}
      <span style={{ fontSize: 10 }}>{active ? (dir === 'asc' ? '▲' : '▼') : '↕'}</span>
    </button>
  )
}

function PriceBar({ value, max, color, label }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 120 }}>
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

function TableSection({ title, icon, color, children, count, controls }) {
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
        <span>비교 기준: <strong>{drug.name} {drug.prices[0]?.spec}</strong> 보험급여가 <strong>{fmt(refPrice)}</strong> (최저 규격)</span>
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
              <Th>비교</Th>
              <Th style={{ minWidth: 130 }}>가격 바</Th>
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
              const diffPct = refPrice ? ((diff / refPrice) * 100).toFixed(0) : 0
              const isHigher = diff > 0
              const isSame = diff === 0
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)' }}>
                  <Td>
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                  </Td>
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 10,
                          fontSize: 12,
                          fontWeight: 700,
                          background: isHigher ? '#fef3c7' : '#dcfce7',
                          color: isHigher ? '#92400e' : '#166534',
                        }}>
                          {isHigher ? '▲' : '▼'} {Math.abs(diffPct)}%
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {isHigher ? '+' : ''}{fmt(diff)}
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

// ── 제네릭 테이블 ────────────────────────────────────────────
function GenericTable({ drug }) {
  const [sort, setSort] = useState({ key: 'insurancePrice', dir: 'asc' })
  const [filter, setFilter] = useState('')
  const [specFilter, setSpecFilter] = useState('all')

  const refPriceBySpec = {}
  drug.prices.forEach(p => { refPriceBySpec[p.spec] = p.insurancePrice })

  // spec 목록 추출 (제네릭 이름에서 mg 파싱)
  const specs = useMemo(() => {
    const set = new Set()
    drug.generics.forEach(g => {
      const m = g.name.match(/\d+mg/g)
      if (m) set.add(m.join('/'))
    })
    return ['all', ...Array.from(set)]
  }, [drug.generics])

  const maxPrice = Math.max(...drug.generics.map(g => g.insurancePrice), ...drug.prices.map(p => p.insurancePrice))

  const toggleSort = key => setSort(prev =>
    prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }
  )

  const rows = useMemo(() => {
    let list = drug.generics
    if (filter.trim()) {
      const q = filter.trim().toLowerCase()
      list = list.filter(g => g.name.toLowerCase().includes(q) || g.manufacturer.toLowerCase().includes(q))
    }
    if (specFilter !== 'all') {
      list = list.filter(g => {
        const m = g.name.match(/\d+mg/g)
        return m && m.join('/') === specFilter
      })
    }
    return [...list].sort((a, b) => {
      let va = a[sort.key], vb = b[sort.key]
      if (typeof va === 'string') va = va.toLowerCase(), vb = vb.toLowerCase()
      if (va < vb) return sort.dir === 'asc' ? -1 : 1
      if (va > vb) return sort.dir === 'asc' ? 1 : -1
      return 0
    })
  }, [drug.generics, sort, filter, specFilter])

  // 규격별 최저가
  const lowestBySpec = useMemo(() => {
    const map = {}
    drug.generics.forEach(g => {
      const m = g.name.match(/\d+mg/g)
      const spec = m ? m.join('/') : '기타'
      if (!map[spec] || g.insurancePrice < map[spec]) map[spec] = g.insurancePrice
    })
    return map
  }, [drug.generics])

  return (
    <TableSection
      title="주요 제네릭 의약품"
      icon="🏭"
      color="#0f766e"
      count={drug.generics.length}
      controls={
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {specs.length > 2 && (
            <select
              value={specFilter}
              onChange={e => setSpecFilter(e.target.value)}
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
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="제품명·제조사 검색"
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
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px',
        background: '#f0fdf4',
        borderBottom: '1px solid #bbf7d0',
        fontSize: 12,
        color: '#166534',
        flexWrap: 'wrap',
        rowGap: 4,
      }}>
        <span>✅</span>
        <span>생물학적 동등성 입증 완료 제품 — 동일 성분·용량으로 오리지널 대비 약 <strong>50%</strong> 수준의 급여가 적용</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
          {Object.entries(lowestBySpec).slice(0, 3).map(([spec, price]) => (
            <span key={spec} style={{ fontSize: 11 }}>
              {spec} 최저: <strong>{fmt(price)}</strong>
            </span>
          ))}
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface-2)', borderBottom: '2px solid var(--border)' }}>
              <Th sortKey="name" currentSort={sort} onSort={toggleSort}>제품명</Th>
              <Th sortKey="manufacturer" currentSort={sort} onSort={toggleSort}>제조사</Th>
              <Th sortKey="approvalDate" currentSort={sort} onSort={toggleSort}>허가일</Th>
              <Th sortKey="insurancePrice" currentSort={sort} onSort={toggleSort}>보험급여가</Th>
              <Th>오리지널 대비</Th>
              <Th>절감액</Th>
              <Th style={{ minWidth: 130 }}>가격 바</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  검색 결과가 없습니다
                </td>
              </tr>
            ) : rows.map((g, i) => {
              // 같은 규격 오리지널 가격 찾기
              const specMatch = g.name.match(/(\d+mg)/g)
              const matchedSpec = specMatch ? specMatch[specMatch.length - 1] : null
              const origPrice = matchedSpec
                ? drug.prices.find(p => p.spec === matchedSpec)?.insurancePrice
                : drug.prices[0]?.insurancePrice
              const saving = origPrice ? origPrice - g.insurancePrice : null
              const ratio = origPrice ? ((g.insurancePrice / origPrice) * 100).toFixed(0) : '-'

              return (
                <tr key={i} style={{ background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)' }}>
                  <Td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontWeight: 600 }}>{g.name}</span>
                    </div>
                  </Td>
                  <Td style={{ color: 'var(--text-secondary)' }}>{g.manufacturer}</Td>
                  <Td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{g.approvalDate}</Td>
                  <Td>
                    <span style={{ fontWeight: 700, fontSize: 15, color: '#0f766e' }}>
                      {fmt(g.insurancePrice)}
                    </span>
                  </Td>
                  <Td>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 700,
                      background: '#dcfce7',
                      color: '#166534',
                    }}>
                      ▼ {ratio}%
                    </span>
                  </Td>
                  <Td>
                    {saving !== null && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <span style={{ fontWeight: 600, color: '#0369a1', fontSize: 13 }}>
                          -{fmt(saving)}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>1정 기준</span>
                      </div>
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
