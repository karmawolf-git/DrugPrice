import React, { useState } from 'react'
import drugs from './data/drugs.js'
import Sidebar from './components/Sidebar.jsx'
import DrugHeader from './components/DrugHeader.jsx'
import ApprovalSection from './components/ApprovalSection.jsx'
import PriceSection from './components/PriceSection.jsx'
import CompetitorSection from './components/CompetitorSection.jsx'
import DiagnosisCodePage from './components/DiagnosisCodePage.jsx'

export default function App() {
  const [selectedId, setSelectedId] = useState(drugs[0].id)
  const [diagDrug, setDiagDrug] = useState(null)
  const [copayRate, setCopayRate] = useState(0.3)   // 본인부담률 (약가·경쟁품·제네릭 공유)
  const drug = drugs.find(d => d.id === selectedId)

  if (diagDrug) {
    return <DiagnosisCodePage drug={diagDrug} onClose={() => setDiagDrug(null)} />
  }

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

        <PriceSection drug={drug} copayRate={copayRate} setCopayRate={setCopayRate} />

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
        }}>
          <ApprovalSection drug={drug} />
          <ReimbursementSection drug={drug} onShowDiag={() => setDiagDrug(drug)} />
        </div>

        <CompetitorSection key={drug.id} drug={drug} allDrugs={drugs} copayRate={copayRate} />

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

function ReimbursementSection({ drug, onShowDiag }) {
  const criteria = Array.isArray(drug.reimbursementCriteria) ? drug.reimbursementCriteria : []

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
        <span style={{ fontSize: 16 }}>📋</span>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>보험급여 기준</span>
        {drug.diagnosisCode && (
          <button
            onClick={onShowDiag}
            style={{
              marginLeft: 8,
              padding: '3px 10px',
              borderRadius: 12,
              border: `1px solid ${drug.color}`,
              background: drug.lightColor,
              color: drug.color,
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            📊 상병코드
          </button>
        )}
        <div style={{ marginLeft: 'auto', width: 32, height: 3, borderRadius: 2, background: drug.color }} />
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {criteria.map((section, si) => (
          <div key={si} style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '8px 14px',
              background: 'var(--surface-2)',
              borderBottom: '1px solid var(--border)',
            }}>
              <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{section.title}</span>
            </div>
            <div style={{ padding: '10px 14px' }}>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(section.items || []).map((item, ii) => (
                  <li key={ii} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{
                      width: 6, height: 6,
                      borderRadius: '50%',
                      background: drug.color,
                      flexShrink: 0,
                      marginTop: 6,
                    }} />
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
