import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { FileText, AlertCircle, Users, ArrowRight } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  badge?: { label: string; positive: boolean };
}

const StatCard = ({ title, value, icon, badge }: StatCardProps) => (
  <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 152, gap: 0, padding: '20px 24px' }}>
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1100, margin: '0 auto' }}>

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="section-title">Dashboard</h1>
          <p className="label" style={{ marginTop: 6 }}>Monitor regulatory updates and client impacts.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input type="date" className="input" style={{ width: 'auto', height: 36, fontSize: 14, padding: '0 12px', borderRadius: 10 }} />
          <select className="input" style={{ width: 'auto', height: 36, fontSize: 14, padding: '0 12px', borderRadius: 10 }}>
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
          title="Pending Approvals"
          value={summary?.pendingApprovals ?? 0}
          icon={<AlertCircle size={20} strokeWidth={1.5} />}
          badge={{ label: 'Action needed', positive: false }}
        />
        <StatCard
          title="Severe Changes"
          value={summary?.severeCount ?? 0}
          icon={<AlertCircle size={20} strokeWidth={1.5} />}
        />
        <StatCard
          title="Total Changes (30d)"
          value={summary?.totalChanges ?? 0}
          icon={<FileText size={20} strokeWidth={1.5} />}
          badge={{ label: '+12%', positive: true }}
        />
        <StatCard
          title="Affected Clients"
          value={summary?.affectedClients ?? 0}
          icon={<Users size={20} strokeWidth={1.5} />}
        />
      </div>

      {/* Recent changes card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Card header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--color-line)' }}>
          <span style={{ fontSize: 16, fontWeight: 500, letterSpacing: '-0.02em' }}>Recent Rule Changes</span>
          <button className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            View all <ArrowRight size={14} strokeWidth={1.5} />
          </button>
        </div>

        {isLoadingChanges ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-muted)', fontSize: 14 }}>Loading…</div>
        ) : (
          <div>
            {recentChanges?.map((change, i) => (
              <div
                key={change.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 24px',
                  borderTop: i === 0 ? 'none' : '1px solid #f0f0f0',
                  transition: 'background .15s ease-out',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-fill)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: '70%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-ink)' }}>{change.category}</span>
                    <span className={`badge ${change.severity === 'severe' ? 'badge-neg' : change.severity === 'minor' ? 'badge-neutral' : 'badge-neutral'}`}>
                      {change.severity}
                    </span>
                    {change.status === 'pending' && (
                      <span className="badge badge-neutral">Pending review</span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--color-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {change.after_text}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>
                    {new Date(change.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <button className="btn btn-primary" style={{ height: 32, fontSize: 13, padding: '0 14px' }}>
                    Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
