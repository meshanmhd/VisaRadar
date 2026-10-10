import React, { useState } from 'react';
import { Search, MoreHorizontal, CheckCircle2, Circle, X, ArrowRight } from 'lucide-react';
import { MOCK_TASKS, MOCK_CHANGES, MOCK_SOURCES, MOCK_IMPACTS } from '../mockData';
import type { Task, Change } from '../types';

export default function Tasks() {
  const [search, setSearch] = useState('');
  const [activeStatus, setActiveStatus] = useState('All');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const getChange = (changeId: string) => MOCK_CHANGES.find(c => c.id === changeId);
  const getSourceCountry = (sourceId?: string) => {
    if (!sourceId) return '—';
    return MOCK_SOURCES.find(s => s.id === sourceId)?.country ?? '—';
  };
  const getImpacts = (changeId: string) => MOCK_IMPACTS.filter(i => i.change_id === changeId);

  const filtered = MOCK_TASKS.filter(t => {
    const matchSearch =
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.owner.toLowerCase().includes(search.toLowerCase());
    const matchStatus = activeStatus === 'All' || t.status === activeStatus.toLowerCase();
    return matchSearch && matchStatus;
  });

  const statuses = ['All', 'Open', 'In_Progress', 'Done'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1100, margin: '0 auto', position: 'relative' }}>

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="section-title">Tasks</h1>
          <p className="label" style={{ marginTop: 6 }}>Manage action items arising from rule changes.</p>
        </div>
        <button className="btn btn-primary">Create Task</button>
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
              placeholder="Search tasks…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 38, height: 36, fontSize: 14, borderRadius: 10 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <select
              className="input"
              value={activeStatus}
              onChange={e => setActiveStatus(e.target.value)}
              style={{ width: 'auto', height: 36, fontSize: 13, padding: '0 12px', borderRadius: 10 }}
            >
              {statuses.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-line)' }}>
              {['Task', 'Country', 'Created', ''].map((col, i) => (
                <th key={i} style={{
                  padding: '10px 20px',
                  fontSize: 11,
                  fontWeight: 500,
                  color: 'var(--color-muted)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  background: 'var(--color-fill)',
                  whiteSpace: 'nowrap',
                  width: i === 3 ? 44 : col === 'Country' ? 160 : col === 'Created' ? 140 : undefined,
                }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!filtered.length ? (
              <tr>
                <td colSpan={4} style={{ padding: 56, textAlign: 'center', color: 'var(--color-muted)', fontSize: 14 }}>
                  No tasks found.
                </td>
              </tr>
            ) : (
              filtered.map((task, i) => {
                const change = getChange(task.change_id);
                return (
                  <tr
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    style={{
                      borderTop: i === 0 ? 'none' : '1px solid #f0f0f0',
                      transition: 'background .15s ease-out',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-fill)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-ink)', lineHeight: 1.5 }}>
                        {task.description}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', verticalAlign: 'middle', color: 'var(--color-ink-soft)', fontSize: 13 }}>
                      {getSourceCountry(change?.source_id)}
                    </td>
                    <td style={{ padding: '16px 20px', verticalAlign: 'middle', color: 'var(--color-muted)', fontSize: 13 }}>
                      {/* Using mock date since task doesn't have created_at */}
                      {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '16px 20px', verticalAlign: 'middle', textAlign: 'right' }}>
                      <button className="btn btn-icon" style={{ borderRadius: '50%' }}>
                        <MoreHorizontal size={16} strokeWidth={1.5} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Popup */}
      {selectedTask && (
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
            width: '100%', maxWidth: 800, maxHeight: '90vh',
            background: 'var(--color-panel)', position: 'relative',
            boxShadow: 'var(--shadow-float)', display: 'flex', flexDirection: 'column',
            padding: 0, overflow: 'hidden'
          }}>
            {/* Header area - sticky */}
            <div style={{ padding: '24px 24px 0', flexShrink: 0, position: 'relative' }}>
              <button
                onClick={() => setSelectedTask(null)}
                className="btn btn-icon"
                style={{ position: 'absolute', top: 20, right: 20, borderRadius: '50%', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={20} strokeWidth={1.5} />
              </button>
              
              <div style={{ marginBottom: 24, paddingRight: 40 }}>
                <h2 className="section-title" style={{ fontSize: 24, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{selectedTask.description}</span>
                </h2>
              </div>
              <div className="divider" style={{ margin: '0 -24px' }} />
            </div>

            {/* Scrollable content area */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>

            {/* Rule Change Details */}
            {getChange(selectedTask.change_id) && (
              <div style={{ marginBottom: 36 }}>
                <h3 style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-ink)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>Rule Change</h3>
                <div style={{ fontSize: 15, color: 'var(--color-ink-soft)', lineHeight: 1.6, marginBottom: 16 }}>
                  {getChange(selectedTask.change_id)?.long_description || getChange(selectedTask.change_id)?.after_text}
                </div>
                
                <div style={{ display: 'flex', alignItems: 'stretch', gap: 16 }}>
                   <div style={{ flex: 1, background: 'var(--color-fill)', padding: '16px 20px', borderRadius: 12, border: '1px solid var(--color-line)' }}>
                      <div style={{ fontSize: 12, color: 'var(--color-muted)', textTransform: 'uppercase', marginBottom: 6, fontWeight: 500 }}>Previous Rule</div>
                      <div style={{ fontSize: 15, color: 'var(--color-ink-soft)' }}>
                        {getChange(selectedTask.change_id)?.short_before || getChange(selectedTask.change_id)?.before_text}
                      </div>
                   </div>
                   <div style={{ display: 'flex', alignItems: 'center', color: 'var(--color-muted)' }}>
                     <ArrowRight size={24} strokeWidth={1} />
                   </div>
                   <div style={{ flex: 1, background: 'var(--color-pos-bg)', padding: '16px 20px', borderRadius: 12, border: '1px solid #d2f0c2' }}>
                      <div style={{ fontSize: 12, color: 'var(--color-pos)', textTransform: 'uppercase', marginBottom: 6, fontWeight: 500 }}>New Rule</div>
                      <div style={{ fontSize: 15, color: 'var(--color-ink)' }}>
                        {getChange(selectedTask.change_id)?.short_after || getChange(selectedTask.change_id)?.after_text}
                      </div>
                   </div>
                </div>
              </div>
            )}

            {/* System Changes Needed */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                 <h3 style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-ink)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>System Changes Needed</h3>
              </div>
              
              <div style={{ border: '1px solid var(--color-line)', borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-fill)', borderBottom: '1px solid var(--color-line)' }}>
                      <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Action to take</th>
                      <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Workflow Stage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getImpacts(selectedTask.change_id).length === 0 ? (
                      <tr>
                        <td colSpan={2} style={{ padding: 24, textAlign: 'center', color: 'var(--color-muted)', fontSize: 14 }}>No immediate system changes identified.</td>
                      </tr>
                    ) : (
                      getImpacts(selectedTask.change_id).map((impact, i) => (
                        <tr key={impact.id} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--color-line)' }}>
                           <td style={{ padding: '16px', verticalAlign: 'top' }}>
                             <div style={{ fontSize: 14, color: 'var(--color-ink)', fontWeight: 500, marginBottom: 4 }}>{impact.actual_action || impact.required_action}</div>
                             <div style={{ fontSize: 13, color: 'var(--color-ink-soft)', lineHeight: 1.5 }}>{impact.short_description || impact.required_action}</div>
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
               <button className="btn" style={{ height: 44, padding: '0 20px', color: 'var(--color-neg)', fontSize: 14, fontWeight: 500 }} onClick={() => setSelectedTask(null)}>
                 Discard Task
               </button>
               <button className="btn btn-primary" style={{ height: 44 }}>Mark as Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
