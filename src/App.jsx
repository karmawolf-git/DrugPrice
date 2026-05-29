import React, { useState } from 'react'
import drugs from './data/drugs.js'
import Sidebar from './components/Sidebar.jsx'
import DrugHeader from './components/DrugHeader.jsx'
import ApprovalSection from './components/ApprovalSection.jsx'
import PriceSection from './components/PriceSection.jsx'
import CompetitorSection from './components/CompetitorSection.jsx'

export default function App() {
  const [selectedId, setSelectedId] = useState(drugs[0].id)
  const drug = drugs.find(d => d.id === selectedId)

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--bg)',
    }}>
      <Sidebar drugs={drugs} selectedId={selectedId} onSelect={setSelectedId} />

      <main style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        minWidth: 0,
      }}>
        <TopBar drug={drug} drugs={drugs} selectedId={selectedId} onSelect={setSelectedId} />
        <DrugHeader drug={drug} />

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <ApprovalSection drug={drug} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <PriceSection drug={drug} />
            <SummaryCard drug={drug} />
          </div>
        </div>

        <CompetitorSection key={drug.id} drug={drug} />

        <footer style={{
          textAlign: 'center',
          padding: '12px 0',
          fontSize: 12,
          color: 'var(--text-muted)',
          borderTop: '1px solid var(--border)',
        }}>
          본 대시보드는 건강보험심사평가원(HIRA) 기준 약가 정보를 바탕으로 한 참고용 데이터입니다. 실제 약가는 고시 변경에 따라 달라질 수 있습니다. 기준일: 2025년 1월
        </footer>
      </main>
    </div>
  )
}

function TopBar({ drug, drugs, selectedId, onSelect }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    }}>
      {drugs.map((d, i) => (
        <React.Fragment key={d.id}>
          <button
            onClick={() => onSelect(d.id)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: selectedId === d.id ? `2px solid ${d.color}` : '2px solid var(--border)',
              background: selectedId === d.id ? d.color : 'var(--surface)',
              color: selectedId === d.id ? '#fff' : 'var(--text-secondary)',
              fontWeight: selectedId === d.id ? 700 : 400,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.15s',
              fontFamily: 'inherit',
            }}
          >
            {d.name}
          </button>
          {i < drugs.length - 1 && (
            <span style={{ color: 'var(--border)', fontSize: 12 }}>›</span>
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

function SummaryCard({ drug }) {
  const lowestInsurance = Math.min(...drug.prices.map(p => p.insurancePrice))
  const highestInsurance = Math.max(...drug.prices.map(p => p.insurancePrice))
  const genCount = drug.generics.length
  const competitorCount = drug.competitors.length

  const items = [
    {
      icon: '💊',
      label: '규격 수',
      value: `${drug.prices.length}종`,
      sub: drug.prices.map(p => p.spec).join(', '),
    },
    {
      icon: '💳',
      label: '급여가 범위',
      value: `${lowestInsurance.toLocaleString()}~${highestInsurance.toLocaleString()}원`,
      sub: '1정/캡슐 기준',
    },
    {
      icon: '🏭',
      label: '제네릭 수',
      value: `${genCount}품목`,
      sub: '주요 제네릭 기준',
    },
    {
      icon: '⚔️',
      label: '경쟁품 수',
      value: `${competitorCount}품목`,
      sub: '동일 적응증 오리지널',
    },
  ]

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
        <span style={{ fontSize: 16 }}>📈</span>
        <span style={{ fontWeight: 700, fontSize: 14 }}>요약 정보</span>
        <div style={{ marginLeft: 'auto', width: 32, height: 3, borderRadius: 2, background: drug.color }} />
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 0,
      }}>
        {items.map((item, i) => (
          <div key={i} style={{
            padding: '14px 18px',
            borderRight: i % 2 === 0 ? '1px solid var(--border)' : 'none',
            borderBottom: i < 2 ? '1px solid var(--border)' : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{item.label}</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: 17, color: drug.color, marginBottom: 2 }}>{item.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.sub}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
