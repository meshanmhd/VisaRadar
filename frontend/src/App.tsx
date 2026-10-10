import React from 'react';
import { BrowserRouter, Routes, Route, Link, Outlet, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LayoutDashboard, List, Users, Settings, Bell, Search } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Changes from './pages/Changes';
import Customers from './pages/Customers';
import Tasks from './pages/Tasks';
import Public from './pages/Public';

const queryClient = new QueryClient();

const NavItem = ({ to, icon: Icon, children }: { to: string; icon: any; children: React.ReactNode }) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
  return (
    <Link to={to} className="nav-item" data-active={isActive ? 'true' : 'false'}>
      <Icon size={20} strokeWidth={1.5} />
      {children}
    </Link>
  );
};

const Layout = () => (
  <div style={{ display: 'flex', height: '100vh', background: 'var(--color-canvas)', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)' }}>
    {/* Sidebar */}
    <aside style={{ width: 240, background: 'var(--color-sidebar)', borderRight: '1px solid var(--color-line)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      {/* Logo */}
      <div style={{ padding: '28px 20px 24px', borderBottom: '1px solid var(--color-line)' }}>
        <span style={{ fontSize: 17, fontWeight: 500, letterSpacing: '-0.03em', color: 'var(--color-ink)' }}>
          RuleMonitor
        </span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span className="nav-label" style={{ padding: '0 14px 8px' }}>Overview</span>
        <NavItem to="/" icon={LayoutDashboard}>Dashboard</NavItem>
        <NavItem to="/changes" icon={List}>Changes</NavItem>

        <span className="nav-label" style={{ padding: '20px 14px 8px' }}>Workspace</span>
        <NavItem to="/customers" icon={Users}>Customers</NavItem>
        <NavItem to="/tasks" icon={List}>Tasks</NavItem>
      </nav>

      {/* Bottom profile */}
      <div style={{ padding: '12px', borderTop: '1px solid var(--color-line)' }}>
        <div className="card" style={{ padding: '12px 14px', borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--color-fill-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500, color: 'var(--color-ink-soft)' }}>AD</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-ink)' }}>Alex Director</div>
              <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>Admin</div>
            </div>
          </div>
          <div className="divider" />
          <NavItem to="/settings" icon={Settings}>Settings</NavItem>
        </div>
      </div>
    </aside>

    {/* Main */}
    <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <header style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', background: '#fff', borderBottom: '1px solid var(--color-line)', flexShrink: 0 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
          <Search size={18} strokeWidth={1.5} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
          <input className="input" placeholder="Search…" style={{ paddingLeft: 44, paddingRight: 44 }} />
          <span className="kbd" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>⌘K</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-icon" style={{ borderRadius: '50%', position: 'relative' }}>
            <Bell size={18} strokeWidth={1.5} />
            <span style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: '50%', background: 'var(--color-neg)', border: '2px solid #fff' }} />
          </button>
        </div>
      </header>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '32px' }}>
        <Outlet />
      </div>
    </main>
  </div>
);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="changes" element={<Changes />} />
            <Route path="customers" element={<Customers />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="settings" element={<div style={{ fontSize: 22, fontWeight: 500, color: 'var(--color-ink)' }}>Settings — coming soon</div>} />
          </Route>
          <Route path="/public" element={<Public />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
