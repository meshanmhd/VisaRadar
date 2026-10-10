import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { Search, MoreHorizontal, AlertTriangle, Clock } from 'lucide-react';
import type { Customer } from '../types';
import { MOCK_IMPACTS } from '../mockData';

const ImpactBadge = ({ customerId }: { customerId: string }) => {
  const impact = MOCK_IMPACTS.find(i => i.customer_id === customerId);
  if (!impact) return <span style={{ color: 'var(--color-muted)', fontSize: 13, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>None</span>;
  if (impact.level === 'severe') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--color-neg)', fontSize: 13, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        <AlertTriangle size={14} strokeWidth={2} /> Severe
      </span>
    );
  }
  if (impact.level === 'minor') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--color-ink-soft)', fontSize: 13, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        <Clock size={14} strokeWidth={2} /> Minor
      </span>
    );
  }
  return <span style={{ color: 'var(--color-muted)', fontSize: 13, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>None</span>;
};

const stages = ['All', 'Pre-Approval', 'Active', 'Post-Approval', 'Closed'];
const criticalities = ['All', 'Severe', 'Minor', 'None'];

const Avatar = ({ name }: { name: string }) => {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: 34, height: 34, borderRadius: '50%',
      background: 'var(--color-fill-strong)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 500, color: 'var(--color-ink-soft)',
      flexShrink: 0,
    }}>{initials}</div>
  );
};

export default function Customers() {
  const [search, setSearch] = useState('');
  const [activeStage, setActiveStage] = useState('All');
  const [activeCriticality, setActiveCriticality] = useState('All');

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: api.getCustomers,
  });

  const filtered = customers?.filter((c: Customer) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.visa_type.toLowerCase().includes(search.toLowerCase());
    const matchStage = activeStage === 'All' || c.stage === activeStage;
    const impact = MOCK_IMPACTS.find(i => i.customer_id === c.id);
    const impactLevel = impact?.level ?? 'none';
    const matchCrit = activeCriticality === 'All' || impactLevel === activeCriticality.toLowerCase();
    return matchSearch && matchStage && matchCrit;
  });

  const columns = ['Client', 'Country', 'Visa Type', 'Stage', 'Contact', 'Language', 'Impact', ''];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1100, margin: '0 auto' }}>

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="section-title">Customers</h1>
          <p className="label" style={{ marginTop: 6 }}>
            {customers?.length ?? 0} clients tracked across all jurisdictions.
          </p>
        </div>
        <button className="btn btn-primary">Add Client</button>
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
            <Search size={16} strokeWidth={1.5} style={{
              position: 'absolute', left: 12, top: '50%',
              transform: 'translateY(-50%)', color: 'var(--color-muted)',
            }} />
            <input
              className="input"
              placeholder="Search by name or visa type…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 38, height: 36, fontSize: 14, borderRadius: 10 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {/* Stage segmented */}
            <div className="segmented">
              {stages.map(s => (
                <button
                  key={s}
                  data-active={activeStage === s ? 'true' : 'false'}
                  onClick={() => setActiveStage(s)}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Criticality filter */}
            <select
              className="input"
              value={activeCriticality}
              onChange={e => setActiveCriticality(e.target.value)}
              style={{ width: 'auto', height: 36, fontSize: 13, padding: '0 12px', borderRadius: 10 }}
            >
              {criticalities.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
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
                <td colSpan={8} style={{ padding: 48, textAlign: 'center', color: 'var(--color-muted)', fontSize: 14 }}>
                  Loading…
                </td>
              </tr>
            ) : !filtered?.length ? (
              <tr>
                <td colSpan={8} style={{ padding: 56, textAlign: 'center', color: 'var(--color-muted)', fontSize: 14 }}>
                  No clients found.
                </td>
              </tr>
            ) : (
              filtered.map((customer: Customer, i: number) => (
                <tr
                  key={customer.id}
                  style={{
                    borderTop: i === 0 ? 'none' : '1px solid #f0f0f0',
                    transition: 'background .15s ease-out',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-fill)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Client */}
                  <td style={{ padding: '14px 20px', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={customer.name} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-ink)' }}>{customer.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>{customer.contact}</div>
                      </div>
                    </div>
                  </td>

                  {/* Country */}
                  <td style={{ padding: '14px 20px', verticalAlign: 'middle', fontSize: 13, color: 'var(--color-ink-soft)' }}>
                    {customer.country}
                  </td>

                  {/* Visa type */}
                  <td style={{ padding: '14px 20px', verticalAlign: 'middle' }}>
                    <span style={{ fontSize: 13, color: 'var(--color-ink-soft)', background: 'var(--color-fill)', padding: '3px 10px', borderRadius: 8 }}>
                      {customer.visa_type}
                    </span>
                  </td>

                  {/* Stage */}
                  <td style={{ padding: '14px 20px', verticalAlign: 'middle', fontSize: 13, color: 'var(--color-ink-soft)' }}>
                    {customer.stage}
                  </td>

                  {/* Contact */}
                  <td style={{ padding: '14px 20px', verticalAlign: 'middle', fontSize: 13, color: 'var(--color-muted)' }}>
                    {customer.contact}
                  </td>

                  {/* Language */}
                  <td style={{ padding: '14px 20px', verticalAlign: 'middle' }}>
                    <span style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-muted)' }}>
                      {customer.language.toUpperCase()}
                    </span>
                  </td>

                  {/* Impact */}
                  <td style={{ padding: '14px 20px', verticalAlign: 'middle' }}>
                    <ImpactBadge customerId={customer.id} />
                  </td>

                  {/* Actions */}
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
              Showing {filtered.length} of {customers?.length} clients
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
