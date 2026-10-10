import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { FileText, AlertCircle, Users, ArrowRight, AlertTriangle, Clock, ShieldCheck } from 'lucide-react';
import { MOCK_IMPACTS, MOCK_SOURCES } from '../mockData';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  badge?: { label: string; positive: boolean };
}

const StatCard = ({ title, value, icon, badge }: StatCardProps) => (
  <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 148, padding: '20px 24px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <span style={{ color: 'var(--color-muted)' }}>{icon}</span>
      {badge && (
        <span className={`badge ${badge.positive ? 'badge-pos' : 'badge-neg'}`}>{badge.label}</span>
      )}
    </div>
    <div>
      <div className="stat">{value}</div>
      <div className="label" style={{ marginTop: 4 }}>{title}</div>
    </div>
  </div>
);

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

const columns = ['Country', 'Change', 'Severity', 'Effective', 'Clients', 'Status', ''];

export default function Dashboard() {
  const { data: summary, isLoading, error } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: api.getDashboardSummary,
  });

  const { data: recentChanges, isLoading: isLoadingChanges } = useQuery({
    queryKey: ['recentChanges'],
    queryFn: api.getChanges,
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)', fontSize: 14 }}>
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="notice" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-neg)', fontSize: 15 }}>
        <AlertCircle size={18} strokeWidth={1.5} /> Error loading dashboard data.
      </div>
    );
  }

  const getSourceCountry = (sourceId: string) =>
    MOCK_SOURCES.find(s => s.id === sourceId)?.country ?? '—';

  const getAffectedCount = (changeId: string) =>
    MOCK_IMPACTS.filter(i => i.change_id === changeId).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1100, margin: '0 auto' }}>

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="section-title">Dashboard</h1>
          <p className="label" style={{ marginTop: 6 }}>Monitor regulatory updates and client impacts.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="date"
            className="input"
            style={{ width: 'auto', height: 36, fontSize: 14, padding: '0 12px', borderRadius: 10 }}
          />
          <select
            className="input"
            style={{ width: 'auto', height: 36, fontSize: 14, padding: '0 12px', borderRadius: 10 }}
          >
            <option>All Jurisdictions</option>
            <option>United Kingdom</option>
            <option>Canada</option>
            <option>Australia</option>
          </select>
        </div>
      </div>

      {/* Stat row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard
          title="Total Changes (30d)"
          value={summary?.totalChanges ?? 0}
          icon={<FileText size={20} strokeWidth={1.5} />}
          badge={{ label: '+12%', positive: true }}
        />
        <StatCard
          title="Severe Changes"
          value={summary?.severeCount ?? 0}
          icon={<AlertTriangle size={20} strokeWidth={1.5} />}
        />
        <StatCard
          title="Affected Clients"
          value={summary?.affectedClients ?? 0}
          icon={<Users size={20} strokeWidth={1.5} />}
        />
        <StatCard
          title="Action Needed"
          value={summary?.pendingApprovals ?? 0}
          icon={<AlertCircle size={20} strokeWidth={1.5} />}
          badge={{ label: 'Pending', positive: false }}
        />
      </div>

      {/* Recent changes table card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Card header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px', borderBottom: '1px solid var(--color-line)',
        }}>
          <span style={{ fontSize: 15, fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--color-ink)' }}>
            Recent Rule Changes
          </span>
          <button className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            View all <ArrowRight size={14} strokeWidth={1.5} />
          </button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-line)' }}>
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
                  textAlign: col === 'Clients' ? 'right' : 'left',
                  width: col === '' ? 44 : col === 'Clients' ? 80 : col === 'Effective' ? 110 : undefined,
                }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoadingChanges ? (
              <tr>
                <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: 'var(--color-muted)', fontSize: 14 }}>
                  Loading…
                </td>
              </tr>
            ) : !recentChanges?.length ? (
              <tr>
                <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: 'var(--color-muted)', fontSize: 14 }}>
                  No changes recorded yet.
                </td>
              </tr>
            ) : (
              recentChanges.map((change, i) => (
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
                  {/* Country */}
                  <td style={{ padding: '14px 20px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-ink-soft)' }}>
                      {getSourceCountry(change.source_id)}
                    </span>
                  </td>

                  {/* Change title */}
                  <td style={{ padding: '14px 20px', verticalAlign: 'middle' }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-ink)' }}>
                      {change.category}
                    </span>
                  </td>

                  {/* Severity */}
                  <td style={{ padding: '14px 20px', verticalAlign: 'middle' }}>
                    <SeverityBadge severity={change.severity} />
                  </td>

                  {/* Effective date */}
                  <td style={{ padding: '14px 20px', verticalAlign: 'middle', fontSize: 13, color: 'var(--color-ink-soft)', whiteSpace: 'nowrap' }}>
                    {change.effective_date ?? <span style={{ color: 'var(--color-muted)', fontStyle: 'italic' }}>TBD</span>}
                  </td>

                  {/* Clients affected */}
                  <td style={{ padding: '14px 20px', verticalAlign: 'middle', textAlign: 'right' }}>
                    <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums' }}>
                      {getAffectedCount(change.id)}
                    </span>
                  </td>

                  {/* Status */}
                  <td style={{ padding: '14px 20px', verticalAlign: 'middle' }}>
                    <StatusBadge status={change.status} />
                  </td>

                  {/* Review */}
                  <td style={{ padding: '14px 20px', verticalAlign: 'middle', textAlign: 'right' }}>
                    <button className="btn btn-secondary" style={{ height: 30, fontSize: 12, padding: '0 12px' }}>
                      Review
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
