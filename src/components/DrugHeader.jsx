import React from 'react'

function Badge({ children, color, bg }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 10px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 600,
      color,
      background: bg,
      whiteSpace: 'nowrap',
    }}>{children}</span>
  )
}

function InfoItem({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 400 }}>{value}</span>
    </div>
  )
}

export default function DrugHeader({ drug }) {
  return (
    <div style={{
      background: 'var(--surface)',
      borderRadius: 'var(--radius)',
      boxShadow: 'var(--shadow-sm)',
      border: '1px solid var(--border)',
      overflow: 'hidden',
    }}>
      <div style={{
        background: `linear-gradient(135deg, ${drug.color} 0%, ${drug.color}cc 100%)`,
        padding: '20px 24px',
        color: '#fff',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>{drug.name}</h1>
              <span style={{ fontSize: 16, fontWeight: 400, opacity: 0.85 }}>{drug.englishName}</span>
            </div>
            <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 12 }}>
              {drug.manufacturer}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <Badge color={drug.color} bg="rgba(255,255,255,0.92)">{drug.type}</Badge>
              <Badge color={drug.color} bg="rgba(255,255,255,0.92)">{drug.form}</Badge>
              <Badge color={drug.color} bg="rgba(255,255,255,0.92)">ATC {drug.atcCode}</Badge>
            </div>
          </div>
          <div style={{
            textAlign: 'right',
            opacity: 0.9,
            flexShrink: 0,
          }}>
            <div style={{ fontSize: 11, opacity: 0.75, marginBottom: 2 }}>허가일</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{drug.approvalDate}</div>
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 0,
        padding: '16px 24px',
        background: drug.lightColor,
        borderTop: `2px solid ${drug.color}22`,
      }}>
        <InfoItem label="성분명 (국문)" value={drug.ingredient} />
        <InfoItem label="성분명 (영문)" value={drug.ingredientEn} />
        <InfoItem label="약효 분류" value={drug.classification} />
        <InfoItem label="급여 코드" value={drug.reimbursementCode} />
      </div>
    </div>
  )
}
