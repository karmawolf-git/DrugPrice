import React from 'react'

function fmt(n) {
  return n.toLocaleString('ko-KR') + '원'
}

function PrescriptionCost({ insurancePrice }) {
  const days = [30, 90, 120]
  return (
    <div style={{ display: 'flex', gap: 5 }}>
      {days.map(d => {
        const total = insurancePrice * d
        const copay = Math.round(total * 0.2)
        return (
          <div key={d} style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            padding: '4px 7px',
            background: 'var(--surface-2)',
            borderRadius: 5,
            border: '1px solid var(--border)',
            minWidth: 76,
          }}>
            <span style={{
              fontSize: 9,
              fontWeight: 700,
              color: 'var(--text-muted)',
              letterSpacing: '0.02em',
            }}>{d}일 처방</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>
              {fmt(total)}
            </span>
            <span style={{ fontSize: 10, color: '#059669' }}>
              본인부담 {fmt(copay)}
            </span>
          </div>
        )
      })}
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

function Td({ children, style }) {
  return (
    <td style={{
      padding: '12px 16px',
      fontSize: 13,
      color: 'var(--text-primary)',
      whiteSpace: 'nowrap',
      ...style,
    }}>{children}</td>
  )
}

export default function PriceSection({ drug }) {
  return (
    <div style={{
      background: 'var(--surface)',
      borderRadius: 'var(--radius)',
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-sm)',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '14px 20px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface-2)',
      }}>
        <span style={{ fontSize: 16 }}>💰</span>
        <span style={{ fontWeight: 700, fontSize: 14 }}>약가 정보</span>
        <span style={{
          marginLeft: 8,
          fontSize: 11,
          color: 'var(--text-muted)',
          padding: '2px 8px',
          background: '#f1f5f9',
          borderRadius: 10,
        }}>1정(캡슐) 기준</span>
        <div style={{ marginLeft: 'auto', width: 32, height: 3, borderRadius: 2, background: drug.color }} />
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: drug.lightColor }}>
              <Th>규격</Th>
              <Th>보험급여가</Th>
              <Th>환자 본인부담</Th>
              <Th>급여율</Th>
              <Th style={{ minWidth: 260 }}>처방기간별 비용</Th>
            </tr>
          </thead>
          <tbody>
            {drug.prices.map((p, i) => {
              const copay = Math.round(p.insurancePrice * 0.2)
              return (
                <tr key={i} style={{
                  borderBottom: '1px solid var(--border)',
                  transition: 'background 0.1s',
                }}>
                  <Td>
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 10px',
                      background: drug.lightColor,
                      color: drug.color,
                      borderRadius: 20,
                      fontWeight: 700,
                      fontSize: 12,
                    }}>{p.spec}</span>
                  </Td>
                  <Td>
                    <span style={{ fontWeight: 700, color: drug.color, fontSize: 15 }}>
                      {fmt(p.insurancePrice)}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>/{p.unit}</span>
                  </Td>
                  <Td>
                    <span style={{ color: '#059669', fontWeight: 600 }}>{fmt(copay)}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>(20%)</span>
                  </Td>
                  <Td>
                    <span style={{
                      padding: '2px 8px',
                      background: '#dcfce7',
                      color: '#16a34a',
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 600,
                    }}>{p.reimbursementRate}</span>
                  </Td>
                  <Td style={{ minWidth: 260 }}>
                    <PrescriptionCost insurancePrice={p.insurancePrice} />
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div style={{
        display: 'flex',
        gap: 16,
        padding: '12px 20px',
        background: '#fffbeb',
        borderTop: '1px solid #fde68a',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13 }}>ℹ️</span>
          <span style={{ fontSize: 12, color: '#92400e' }}>
            처방기간별 비용은 1일 1정 기준 참고값입니다. 환자 본인부담금은 일반 외래 기준 20%이며, 의료기관 종별·질환에 따라 다를 수 있습니다.
          </span>
        </div>
      </div>
    </div>
  )
}
