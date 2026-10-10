import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { Search, AlertTriangle, ShieldCheck, Clock, MoreHorizontal } from 'lucide-react';
import type { Change } from '../types';

const SeverityBadge = ({ severity }: { severity: string }) => {
  if (severity === 'severe') return (
    <span className="badge badge-neg" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <AlertTriangle size={11} strokeWidth={1.5} /> Severe
    </span>
  );
  if (severity === 'minor') return (
    <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <Clock size={11} strokeWidth={1.5} /> Minor
    </span>
  );
  return <span className="badge badge-neutral">None</span>;
};

const StatusBadge = ({ status }: { status: string }) => {
  if (status === 'verified') return (
    <span className="badge badge-pos" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <ShieldCheck size={11} strokeWidth={1.5} /> Verified
    </span>
  );
  if (status === 'pending') return <span className="badge badge-neutral">Pending</span>;
  if (status === 'false_positive') return <span className="badge badge-neutral">False positive</span>;
  return <span className="badge badge-neutral">{status}</span>;
};

const ConfidenceBar = ({ level }: { level: string }) => {
  const filled = level === 'high' ? 3 : level === 'medium' ? 2 : 1;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ display: 'flex', gap: 3 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{
            width: 4, height: 14, borderRadius: 2,
            background: i <= filled ? 'var(--color-ink)' : 'var(--color-fill-strong)',
          }} />
        ))}
      </div>
      <span style={{ fontSize: 12, color: 'var(--color-muted)', textTransform: 'capitalize' }}>{level}</span>
    </div>
  );
};

const severities = ['All', 'Severe', 'Minor', 'None'];
const statuses = ['All', 'Pending', 'Verified', 'False positive'];

const columns = ['Category & details', 'Severity', 'Confidence', 'Status', 'Effective', ''];

export default function Changes() {
  const [search, setSearch] = useState('');
  const [activeSev, setActiveSev] = useState('All');
  const [activeStatus, setActiveStatus] = useState('All');

  const { data: changes, isLoading } = useQuery({
    queryKey: ['changes'],
    queryFn: api.getChanges,
  });

  const filtered = changes?.filter((c: Change) => {
    const matchSearch =
      c.category.toLowerCase().includes(search.toLowerCase()) ||
      c.after_text.toLowerCase().includes(search.toLowerCase());
    const matchSev = activeSev === 'All' || c.severity === activeSev.toLowerCase();
    const matchStatus = activeStatus === 'All' || c.status === activeStatus.toLowerCase().replace(' ', '_');
    return matchSearch && matchSev && matchStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1100, margin: '0 auto' }}>

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="section-title">Rule Changes</h1>
          <p className="label" style={{ marginTop: 6 }}>Review, verify, and action incoming regulatory updates.</p>
        </div>
        <button className="btn btn-primary">Run Manual Check</button>
      </div>

      {/* Table card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

        {/* Toolbar — matches image pattern */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '1px solid var(--color-line)',
          gap: 12, flexWrap: 'wrap',
        }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
            <Search size={16} strokeWidth={1.5} style={{
              position: 'absolute', left: 12, top: '50%',
              transform: 'translateY(-50%)', color: 'var(--color-muted)',
            }} />
            <input
              className="input"
              placeholder="Search by category or keyword…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 38, height: 36, fontSize: 14, borderRadius: 10 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {/* Severity segmented — matches image tab row */}
            <div className="segmented">
              {severities.map(s => (
                <button
                  key={s}
                  data-active={activeSev === s ? 'true' : 'false'}
                  onClick={() => setActiveSev(s)}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Status filter */}
            <select
              className="input"
              value={activeStatus}
              onChange={e => setActiveStatus(e.target.value)}
              style={{ width: 'auto', height: 36, fontSize: 13, padding: '0 12px', borderRadius: 10 }}
            >
              {statuses.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-line)' }}>
              <th style={{ padding: '10px 20px', width: 44, background: 'var(--color-fill)' }}>
                <input type="checkbox" style={{ accentColor: 'var(--color-ink)', width: 15, height: 15 }} />
              </th>
              {columns.map((col, i) => (
                <th key={i} style={{
                  padding: '10px 20px',
                  fontSize: 11,
                  fontWeight: 500,
                  color: 'var(--color-muted)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  background: 'var(--color-fill)',
                  whiteSpace: 'nowrap',
                  width: i === columns.length - 1 ? 44 : undefined,
                }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} style={{ padding: 56, textAlign: 'center', color: 'var(--color-muted)', fontSize: 14 }}>
                  Loading…
                </td>
              </tr>
            ) : !filtered?.length ? (
              <tr>
                <td colSpan={7} style={{ padding: 56, textAlign: 'center', color: 'var(--color-muted)', fontSize: 14 }}>
                  No rule changes found.
                </td>
              </tr>
            ) : (
              filtered.map((change: Change, i: number) => (
                <tr
                  key={change.id}
                  style={{
                    borderTop: i === 0 ? 'none' : '1px solid #f0f0f0',
                    transition: 'background .15s ease-out',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-fill)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '14px 20px', verticalAlign: 'middle', width: 44 }}>
                    <input type="checkbox" style={{ accentColor: 'var(--color-ink)', width: 15, height: 15 }} />
                  </td>
                  <td style={{ padding: '14px 20px', verticalAlign: 'top', maxWidth: 400 }}>
                    <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--color-ink)', marginBottom: 4 }}>
                      {change.category}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.55, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {change.after_text}
                    </div>
                    <span style={{ display: 'inline-block', marginTop: 8, fontSize: 11, color: 'var(--color-muted)', background: 'var(--color-fill)', padding: '2px 8px', borderRadius: 6, fontFamily: 'monospace', letterSpacing: 0 }}>
                      {change.source_id}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', verticalAlign: 'middle' }}>
                    <SeverityBadge severity={change.severity} />
                  </td>
                  <td style={{ padding: '14px 20px', verticalAlign: 'middle' }}>
                    <ConfidenceBar level={change.confidence} />
                  </td>
                  <td style={{ padding: '14px 20px', verticalAlign: 'middle' }}>
                    <StatusBadge status={change.status} />
                  </td>
                  <td style={{ padding: '14px 20px', verticalAlign: 'middle', fontSize: 13, color: 'var(--color-ink-soft)', whiteSpace: 'nowrap' }}>
                    {change.effective_date ?? <span style={{ color: 'var(--color-muted)', fontStyle: 'italic' }}>TBD</span>}
                  </td>
                  <td style={{ padding: '14px 20px', verticalAlign: 'middle', textAlign: 'right' }}>
                    <button className="btn btn-icon" style={{ borderRadius: '50%' }}>
                      <MoreHorizontal size={16} strokeWidth={1.5} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Footer */}
        {filtered && filtered.length > 0 && (
          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--color-line)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>
              {filtered.length} change{filtered.length !== 1 ? 's' : ''}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-secondary" style={{ height: 30, fontSize: 13 }}>Previous</button>
              <button className="btn btn-secondary" style={{ height: 30, fontSize: 13 }}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
