import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { Search, Calendar } from 'lucide-react';
import { MOCK_SOURCES } from '../mockData';

export default function Public() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('All');
  const [selectedDate, setSelectedDate] = useState('');

  const { data: changes, isLoading } = useQuery({
    queryKey: ['changes'],
    queryFn: api.getChanges,
  });

  const getSourceCountry = (sourceId: string) => 
    MOCK_SOURCES.find(s => s.id === sourceId)?.country ?? '—';

  const filtered = changes?.filter(c => {
    const country = getSourceCountry(c.source_id);
    const matchSearch =
      c.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.after_text.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCountry = selectedCountry === 'All' || country === selectedCountry;
    const matchDate = !selectedDate || c.created_at.startsWith(selectedDate);
    return matchSearch && matchCountry && matchDate;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1200, margin: '40px auto', padding: '0 32px' }}>

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h1 className="section-title" style={{ fontSize: 32 }}>Public Regulatory Tracker</h1>
        <p className="label" style={{ marginTop: 8, fontSize: 16 }}>Search and review the latest immigration rule changes globally.</p>
      </div>

      {/* Toolbar */}
      <div className="card" style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 280 }}>
          <Search size={18} strokeWidth={1.5} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
          <input
            className="input"
            placeholder="Search regulations, visa types, or keywords…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: 46, height: 48, fontSize: 15, borderRadius: 12 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {/* Country Filter */}
          <select
            className="input"
            value={selectedCountry}
            onChange={e => setSelectedCountry(e.target.value)}
            style={{ width: 180, height: 48, fontSize: 15, padding: '0 16px', borderRadius: 12 }}
          >
            <option value="All">All Countries</option>
            <option value="UK">United Kingdom</option>
            <option value="Canada">Canada</option>
            <option value="Australia">Australia</option>
          </select>

          {/* Date Picker */}
          <div style={{ position: 'relative' }}>
            <input
              type="date"
              className="input"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              style={{ width: 180, height: 48, fontSize: 15, padding: '0 16px', borderRadius: 12 }}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-line)' }}>
              {['Country', 'Rule Change', 'Effective From', 'Date Announced'].map((col, i) => (
                <th key={i} style={{
                  padding: '16px 24px',
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--color-muted)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  background: 'var(--color-fill)',
                  whiteSpace: 'nowrap',
                }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} style={{ padding: 64, textAlign: 'center', color: 'var(--color-muted)', fontSize: 15 }}>
                  Loading records…
                </td>
              </tr>
            ) : !filtered?.length ? (
              <tr>
                <td colSpan={4} style={{ padding: 64, textAlign: 'center', color: 'var(--color-muted)', fontSize: 15 }}>
                  No regulatory changes found matching your criteria.
                </td>
              </tr>
            ) : (
              filtered.slice(0, 30).map((change, i) => (
                <tr
                  key={change.id}
                  style={{
                    borderTop: i === 0 ? 'none' : '1px solid #f0f0f0',
                    transition: 'background .15s ease-out',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-fill)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '20px 24px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-ink-soft)' }}>
                      {getSourceCountry(change.source_id)}
                    </span>
                  </td>
                  <td style={{ padding: '20px 24px', verticalAlign: 'middle' }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-ink)', marginBottom: 4 }}>
                      {change.short_title || change.category}
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--color-muted)' }}>
                      {change.long_description?.substring(0, 100)}...
                    </div>
                  </td>
                  <td style={{ padding: '20px 24px', verticalAlign: 'middle', fontSize: 14, color: 'var(--color-ink-soft)', whiteSpace: 'nowrap' }}>
                    {change.effective_date ? new Date(change.effective_date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : 'TBD'}
                  </td>
                  <td style={{ padding: '20px 24px', verticalAlign: 'middle', fontSize: 14, color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(change.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
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
