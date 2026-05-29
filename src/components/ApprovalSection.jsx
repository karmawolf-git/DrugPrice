import React, { useState } from 'react'

function SectionCard({ title, icon, children, accentColor }) {
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
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{title}</span>
        <div style={{ marginLeft: 'auto', width: 32, height: 3, borderRadius: 2, background: accentColor }} />
      </div>
      <div style={{ padding: '16px 20px' }}>
        {children}
      </div>
    </div>
  )
}

function ListItems({ items, accentColor }) {
  return (
    <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, listStyle: 'none' }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: accentColor,
            marginTop: 6,
            flexShrink: 0,
          }} />
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export default function ApprovalSection({ drug }) {
  const [open, setOpen] = useState({ indications: true, dosage: true, cautions: true })
  const toggle = key => setOpen(prev => ({ ...prev, [key]: !prev[key] }))

  return (
    <SectionCard title="허가사항" icon="📋" accentColor={drug.color}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Accordion
          title="효능·효과"
          open={open.indications}
          onToggle={() => toggle('indications')}
          color={drug.color}
        >
          <ListItems items={drug.indications} accentColor={drug.color} />
        </Accordion>

        <Accordion
          title="용법·용량"
          open={open.dosage}
          onToggle={() => toggle('dosage')}
          color={drug.color}
        >
          <ListItems items={drug.dosage} accentColor={drug.color} />
        </Accordion>

        <Accordion
          title="주요 주의사항 및 금기"
          open={open.cautions}
          onToggle={() => toggle('cautions')}
          color={drug.color}
          caution
        >
          <ListItems items={drug.cautions} accentColor="#ef4444" />
        </Accordion>
      </div>
    </SectionCard>
  )
}

function Accordion({ title, open, onToggle, color, caution, children }) {
  return (
    <div style={{
      border: `1px solid ${caution ? '#fee2e2' : 'var(--border)'}`,
      borderRadius: 'var(--radius-sm)',
      overflow: 'hidden',
      background: caution ? '#fff5f5' : 'var(--surface-2)',
    }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {caution && <span style={{ fontSize: 14 }}>⚠️</span>}
          <span style={{ fontWeight: 600, fontSize: 13, color: caution ? '#b91c1c' : 'var(--text-primary)' }}>{title}</span>
        </div>
        <span style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
        }}>▼</span>
      </button>
      {open && (
        <div style={{ padding: '2px 14px 14px' }}>
          {children}
        </div>
      )}
    </div>
  )
}
