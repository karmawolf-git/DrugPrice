import React, { useState } from 'react'

function fmt(n) {
  return n.toLocaleString('ko-KR') + '원'
}

export default function CompetitorSection({ drug }) {
  const [tab, setTab] = useState('competitors')

  const origMaxPrice = Math.max(
    ...drug.prices.map(p => p.insurancePrice),
    ...drug.competitors.map(c => c.insurancePrice),
  )
  const genMaxPrice = Math.max(
    ...drug.prices.map(p => p.insurancePrice),
    ...drug.generics.map(g => g.insurancePrice),
  )

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
      }}>
        <span style={{ fontSize: 16 }}>📊</span>
        <span style={{ fontWeight: 700, fontSize: 14 }}>경쟁품 및 제네릭 약가 비교</span>
        <div style={{ marginLeft: 'auto', width: 32, height: 3, borderRadius: 2, background: drug.color }} />
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
        {[
          { id: 'competitors', label: `경쟁 오리지널 (${drug.competitors.length})` },
          { id: 'generics', label: `주요 제네릭 (${drug.generics.length})` },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderBottom: tab === t.id ? `2px solid ${drug.color}` : '2px solid transparent',
              background: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: tab === t.id ? 700 : 400,
              color: tab === t.id ? drug.color : 'var(--text-secondary)',
              transition: 'all 0.15s',
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'competitors' && (
        <CompetitorTable
          drug={drug}
          competitors={drug.competitors}
          maxPrice={origMaxPrice}
        />
      )}
      {tab === 'generics' && (
        <GenericTable
          drug={drug}
          generics={drug.generics}
          maxPrice={genMaxPrice}
        />
      )}
    </div>
  )
}

function PriceDot({ value, max, color }) {
  const pct = Math.round((value / max) * 100)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 140 }}>
      <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: color,
          borderRadius: 3,
          transition: 'width 0.4s ease',
        }} />
      </div>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 28, textAlign: 'right' }}>{pct}%</span>
    </div>
  )
}

function CompetitorTable({ drug, competitors, maxPrice }) {
  const origPrice = drug.prices[0]?.insurancePrice

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--surface-2)' }}>
            <Th>제품명</Th>
            <Th>제조사</Th>
            <Th>성분명</Th>
            <Th>분류</Th>
            <Th>보험급여가</Th>
            <Th>오리지널 대비</Th>
            <Th style={{ minWidth: 150 }}>상대가격</Th>
          </tr>
        </thead>
        <tbody>
          {competitors.map((c, i) => {
            const ratio = origPrice ? ((c.insurancePrice / origPrice) * 100).toFixed(0) : '-'
            const isHigher = c.insurancePrice > origPrice
            return (
              <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                <Td>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</span>
                </Td>
                <Td>{c.manufacturer}</Td>
                <Td>
                  <span style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    background: '#f1f5f9',
                    borderRadius: 10,
                    color: 'var(--text-secondary)',
                  }}>{c.ingredient}</span>
                </Td>
                <Td>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.class}</span>
                </Td>
                <Td>
                  <span style={{ fontWeight: 700, color: isHigher ? '#b45309' : '#0f766e', fontSize: 14 }}>
                    {fmt(c.insurancePrice)}
                  </span>
                </Td>
                <Td>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 600,
                    background: isHigher ? '#fef3c7' : '#dcfce7',
                    color: isHigher ? '#92400e' : '#166534',
                  }}>
                    {isHigher ? '▲' : '▼'} {ratio}%
                  </span>
                </Td>
                <Td><PriceDot value={c.insurancePrice} max={maxPrice} color={drug.color} /></Td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function GenericTable({ drug, generics, maxPrice }) {
  const origPrice = drug.prices[0]?.insurancePrice

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 16px',
        background: '#f0fdf4',
        borderBottom: '1px solid #bbf7d0',
      }}>
        <span style={{ fontSize: 13 }}>✅</span>
        <span style={{ fontSize: 12, color: '#166534' }}>
          제네릭 의약품은 동일 성분·용량으로 생물학적 동등성이 입증된 제품입니다.
          오리지널 대비 약 <strong>50%</strong> 수준의 급여가를 적용받습니다.
        </span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--surface-2)' }}>
            <Th>제품명</Th>
            <Th>제조사</Th>
            <Th>허가일</Th>
            <Th>보험급여가</Th>
            <Th>오리지널 대비</Th>
            <Th style={{ minWidth: 150 }}>상대가격</Th>
          </tr>
        </thead>
        <tbody>
          {generics.map((g, i) => {
            const ratio = origPrice ? ((g.insurancePrice / origPrice) * 100).toFixed(0) : '-'
            return (
              <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                <Td>
                  <span style={{ fontWeight: 600 }}>{g.name}</span>
                </Td>
                <Td>{g.manufacturer}</Td>
                <Td>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{g.approvalDate}</span>
                </Td>
                <Td>
                  <span style={{ fontWeight: 700, color: '#0f766e', fontSize: 14 }}>
                    {fmt(g.insurancePrice)}
                  </span>
                </Td>
                <Td>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 600,
                    background: '#dcfce7',
                    color: '#166534',
                  }}>
                    ▼ {ratio}%
                  </span>
                </Td>
                <Td><PriceDot value={g.insurancePrice} max={maxPrice} color="#10b981" /></Td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Th({ children, style }) {
  return (
    <th style={{
      padding: '10px 16px',
      textAlign: 'left',
      fontSize: 12,
      fontWeight: 600,
      color: 'var(--text-secondary)',
      whiteSpace: 'nowrap',
      ...style,
    }}>{children}</th>
  )
}

function Td({ children }) {
  return (
    <td style={{
      padding: '12px 16px',
      fontSize: 13,
      color: 'var(--text-primary)',
    }}>{children}</td>
  )
}
