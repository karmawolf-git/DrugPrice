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
          </div>
        </div>

        <ReimbursementSection drug={drug} />

        <CompetitorSection key={drug.id} drug={drug} />

        <footer style={{
          textAlign: 'center',
          padding: '12px 0',
          fontSize: 12,
          color: 'var(--text-muted)',
          borderTop: '1px solid var(--border)',
        }}>
          본 대시보드는 건강보험심사평가원(HIRA) 기준 약가 정보를 바탕으로 한 참고용 데이터입니다. 실제 약가는 고시 변경에 따라 달라질 수 있습니다. 기준일: 2026년 6월 1일
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

function ReimbursementSection({ drug }) {
  const criteria = Array.isArray(drug.reimbursementCriteria) ? drug.reimbursementCriteria : []

  return (
    <div style={{
      borderRadius: 'var(--radius)',
      border: `2px solid ${drug.color}`,
      boxShadow: 'var(--shadow)',
      overflow: 'hidden',
      background: '#ffffff',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '14px 20px',
        borderBottom: `2px solid ${drug.color}`,
        background: drug.lightColor,
      }}>
        <span style={{ fontSize: 16 }}>📋</span>
        <span style={{ fontWeight: 700, fontSize: 14, color: drug.color }}>보험급여 기준</span>
        <span style={{
          padding: '2px 8px',
          background: '#fff',
          color: drug.color,
          borderRadius: 10,
          fontSize: 11,
          fontWeight: 700,
          border: `1px solid ${drug.color}`,
        }}>HIRA 고시 기준</span>
      </div>

      <div>
        {criteria.map((section, si) => (
          <div key={si} style={{
            padding: '16px 24px',
            borderBottom: si < criteria.length - 1 ? '1px solid #e2e8f0' : 'none',
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              marginBottom: 10,
              padding: '4px 12px',
              borderRadius: 6,
              background: drug.lightColor,
              border: `1px solid ${drug.color}`,
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: drug.color }}>{section.title}</span>
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
              {(section.items || []).map((item, ii) => (
                <li key={ii} style={{ display: 'flex', gap: 10, fontSize: 13, color: '#0f172a', lineHeight: 1.6 }}>
                  <span style={{
                    width: 6, height: 6,
                    borderRadius: '50%',
                    background: drug.color,
                    flexShrink: 0,
                    marginTop: 7,
                  }} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
