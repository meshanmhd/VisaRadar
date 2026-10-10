import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { Search, SlidersHorizontal, AlertTriangle, ShieldCheck, Clock, X, Users, ArrowRight, ExternalLink } from 'lucide-react';
import type { Change } from '../types';
import { MOCK_IMPACTS, MOCK_SOURCES } from '../mockData';

const SeverityBadge = ({ severity }: { severity: string }) => {
  if (severity === 'severe') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--color-neg)', fontSize: 13, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        <AlertTriangle size={14} strokeWidth={2} /> Severe
      </span>
    );
  }
  if (severity === 'minor') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--color-ink-soft)', fontSize: 13, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        <Clock size={14} strokeWidth={2} /> Minor
      </span>
    );
  }
  return <span style={{ color: 'var(--color-muted)', fontSize: 13, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>None</span>;
};

const StatusBadge = ({ status }: { status: string }) => {
  if (status === 'verified') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--color-pos)', fontSize: 13, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        <ShieldCheck size={14} strokeWidth={2} /> Verified
      </span>
    );
  }
  if (status === 'pending') {
    return <span style={{ color: 'var(--color-ink-soft)', fontSize: 13, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pending review</span>;
  }
  if (status === 'false_positive') {
    return <span style={{ color: 'var(--color-muted)', fontSize: 13, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>False positive</span>;
  }
  return <span style={{ color: 'var(--color-ink-soft)', fontSize: 13, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{status}</span>;
};

const ConfidenceBar = ({ level }: { level: string }) => {
  const filled = level === 'high' ? 3 : level === 'medium' ? 2 : 1;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ display: 'flex', gap: 3 }}>
        {[1, 2, 3].map(i => (
          <div
            key={i}
            style={{
              width: 4,
              height: 14,
              borderRadius: 2,
              background: i <= filled ? 'var(--color-ink)' : 'var(--color-fill-strong)',
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: 12, color: 'var(--color-muted)', textTransform: 'capitalize' }}>{level}</span>
    </div>
  );
};

export default function Changes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [selectedChange, setSelectedChange] = useState<Change | null>(null);

  const { data: changes, isLoading } = useQuery({
    queryKey: ['changes'],
    queryFn: api.getChanges,
  });

  const getSourceCountry = (sourceId: string) => MOCK_SOURCES.find(s => s.id === sourceId)?.country ?? '—';
  const getSourceUrl = (sourceId: string) => MOCK_SOURCES.find(s => s.id === sourceId)?.url ?? '#';

  const filtered = changes?.filter(c => {
    const matchSearch =
      c.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.after_text.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSev = filterSeverity === 'all' || c.severity === filterSeverity;
    return matchSearch && matchSev;
  });

  const getImpacts = (changeId: string) => MOCK_IMPACTS.filter(i => i.change_id === changeId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1100, margin: '0 auto', position: 'relative' }}>

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="section-title">Rule Changes</h1>
          <p className="label" style={{ marginTop: 6 }}>Review, verify, and action incoming regulatory updates.</p>
        </div>
        <button className="btn btn-primary">
          Run Manual Check
        </button>
      </div>

      {/* Table card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        
        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '1px solid var(--color-line)',
          gap: 12, flexWrap: 'wrap',
        }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
            <Search size={16} strokeWidth={1.5} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
            <input
              className="input"
              placeholder="Search by category or keyword…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: 38, height: 36, fontSize: 14, borderRadius: 10 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <SlidersHorizontal size={16} strokeWidth={1.5} style={{ color: 'var(--color-muted)', marginRight: 4 }} />
            
            {/* Severity segmented */}
            <div className="segmented">
              {['All', 'Severe', 'Minor'].map(s => (
                <button
                  key={s}
                  data-active={filterSeverity === (s === 'All' ? 'all' : s.toLowerCase()) ? 'true' : 'false'}
                  onClick={() => setFilterSeverity(s === 'All' ? 'all' : s.toLowerCase())}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Status filter */}
            <select
              className="input"
              style={{ width: 'auto', height: 36, fontSize: 13, padding: '0 12px', borderRadius: 10 }}
            >
              <option>All Statuses</option>
              <option>Pending</option>
              <option>Verified</option>
            </select>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-line)', background: 'var(--color-fill)' }}>
              {['Country', 'Category & details', 'Severity', 'Status', 'Effective'].map((h, i) => (
                <th
                  key={i}
                  style={{
                    padding: '12px 20px',
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'var(--color-muted)',
                    letterSpacing: 0,
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    textAlign: i === 4 ? 'right' : 'left',
                    width: i === 4 ? 110 : undefined,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} style={{ padding: 48, textAlign: 'center', color: 'var(--color-muted)', fontSize: 14 }}>
                  Loading…
                </td>
              </tr>
            ) : filtered?.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 48, textAlign: 'center', color: 'var(--color-muted)', fontSize: 14 }}>
                  No rule changes found.
                </td>
              </tr>
            ) : (
              filtered?.map((change: Change, i: number) => (
                <tr
                  key={change.id}
                  onClick={() => setSelectedChange(change)}
                  style={{
                    borderTop: i === 0 ? 'none' : '1px solid #f0f0f0',
                    transition: 'background .15s ease-out',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-fill)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '16px 20px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-ink-soft)' }}>
                      {getSourceCountry(change.source_id)}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', verticalAlign: 'top' }}>
                    <div style={{ fontWeight: 500, fontSize: 15, color: 'var(--color-ink)' }}>
                      {change.short_title || change.category}
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px', verticalAlign: 'top' }}>
                    <SeverityBadge severity={change.severity} />
                  </td>
                  <td style={{ padding: '16px 20px', verticalAlign: 'top' }}>
                    <StatusBadge status={change.status} />
                  </td>
                  <td style={{ padding: '16px 20px', verticalAlign: 'top', textAlign: 'right', fontSize: 13, color: 'var(--color-ink-soft)' }}>
                    {change.effective_date ?? <span style={{ color: 'var(--color-muted)', fontStyle: 'italic' }}>TBD</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Popup */}
      {selectedChange && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 24,
        }}>
          <div className="card" style={{
            width: '100%', maxWidth: 860, maxHeight: '90vh',
            background: 'var(--color-panel)', position: 'relative',
            boxShadow: 'var(--shadow-float)', display: 'flex', flexDirection: 'column',
            padding: 0, overflow: 'hidden'
          }}>
            {/* Header area - sticky */}
            <div style={{ padding: '24px 24px 0', flexShrink: 0, position: 'relative' }}>
              <button
                onClick={() => setSelectedChange(null)}
                className="btn btn-icon"
                style={{ position: 'absolute', top: 20, right: 20, borderRadius: '50%', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={20} strokeWidth={1.5} />
              </button>
              
              <div style={{ marginBottom: 20, paddingRight: 40 }}>
                <h2 className="section-title" style={{ fontSize: 24, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}>{getSourceCountry(selectedChange.source_id)}</span>
                  <span style={{ color: 'var(--color-line-strong)', fontWeight: 300 }}>|</span>
                  <span>{selectedChange.short_title || selectedChange.category}</span>
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <span style={{ fontSize: 14, color: 'var(--color-muted)' }}>Effective from: <span style={{ color: 'var(--color-ink)', fontWeight: 500 }}>{selectedChange.effective_date ?? 'TBD'}</span></span>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <SeverityBadge severity={selectedChange.severity} />
                    <StatusBadge status={selectedChange.status} />
                  </div>
                </div>
              </div>
              <div className="divider" style={{ margin: '0 -24px' }} />
            </div>

            {/* Scrollable content area */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>

            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 15, color: 'var(--color-ink-soft)', lineHeight: 1.6, marginBottom: 16 }}>
                {selectedChange.long_description || selectedChange.after_text}
              </div>
              <a href={getSourceUrl(selectedChange.source_id)} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ display: 'inline-flex' }}>
                View Original Document <ExternalLink size={16} style={{ marginLeft: 4 }} />
              </a>
            </div>

            <div style={{ marginBottom: 36 }}>
              <h3 style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-ink)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>Compare Change</h3>
              <div style={{ display: 'flex', alignItems: 'stretch', gap: 16 }}>
                 <div style={{ flex: 1, background: 'var(--color-fill)', padding: '16px 20px', borderRadius: 12, border: '1px solid var(--color-line)' }}>
                    <div style={{ fontSize: 12, color: 'var(--color-muted)', textTransform: 'uppercase', marginBottom: 6, fontWeight: 500 }}>Previous Rule</div>
                    <div style={{ fontSize: 15, color: 'var(--color-ink-soft)' }}>
                      {selectedChange.short_before || selectedChange.before_text}
                    </div>
                 </div>
                 <div style={{ display: 'flex', alignItems: 'center', color: 'var(--color-muted)' }}>
                   <ArrowRight size={24} strokeWidth={1} />
                 </div>
                 <div style={{ flex: 1, background: 'var(--color-pos-bg)', padding: '16px 20px', borderRadius: 12, border: '1px solid #d2f0c2' }}>
                    <div style={{ fontSize: 12, color: 'var(--color-pos)', textTransform: 'uppercase', marginBottom: 6, fontWeight: 500 }}>New Rule</div>
                    <div style={{ fontSize: 15, color: 'var(--color-ink)' }}>
                      {selectedChange.short_after || selectedChange.after_text}
                    </div>
                 </div>
              </div>
            </div>

            <div style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                 <h3 style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-ink)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>Required System Changes</h3>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-muted)', fontSize: 13 }}>
                   <Users size={14} strokeWidth={1.5} /> {getImpacts(selectedChange.id).length} customers affected
                 </div>
              </div>
              
              <div style={{ border: '1px solid var(--color-line)', borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-fill)', borderBottom: '1px solid var(--color-line)' }}>
                      <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Action to take</th>
                      <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Description</th>
                      <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Workflow Stage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getImpacts(selectedChange.id).length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ padding: 24, textAlign: 'center', color: 'var(--color-muted)', fontSize: 14 }}>No immediate system changes identified.</td>
                      </tr>
                    ) : (
                      getImpacts(selectedChange.id).map((impact, i) => (
                        <tr key={impact.id} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--color-line)' }}>
                           <td style={{ padding: '16px', verticalAlign: 'top' }}>
                             <div style={{ fontSize: 14, color: 'var(--color-ink)', fontWeight: 500 }}>{impact.actual_action || impact.required_action}</div>
                           </td>
                           <td style={{ padding: '16px', verticalAlign: 'top' }}>
                             <div style={{ fontSize: 14, color: 'var(--color-ink-soft)', lineHeight: 1.5 }}>{impact.short_description || impact.required_action}</div>
                           </td>
                           <td style={{ padding: '16px', verticalAlign: 'top' }}>
                             <div style={{ display: 'inline-flex', padding: '4px 10px', background: 'var(--color-fill)', borderRadius: 6, fontSize: 12, color: 'var(--color-ink-soft)', fontWeight: 500 }}>
                               {impact.system_step || 'Unknown Step'}
                             </div>
                           </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            </div>
            
            {/* Footer - sticky */}
            <div style={{ padding: '24px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, borderTop: '1px solid var(--color-line)', flexShrink: 0 }}>
               <button className="btn" style={{ height: 44, padding: '0 20px', color: 'var(--color-neg)', fontSize: 14, fontWeight: 500 }} onClick={() => setSelectedChange(null)}>
                 Discard Change
               </button>
               <button className="btn btn-primary" style={{ height: 44 }}>Reviewed & Create Tasks</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
