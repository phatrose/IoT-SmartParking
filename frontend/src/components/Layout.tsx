import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface NavItem { to: string; icon: string; label: string; roles?: string[] }

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard',  icon: '◉', label: 'Dashboard' },
  { to: '/map',        icon: '⊞', label: 'Bản đồ bãi xe' },
  { to: '/reports',    icon: '📊', label: 'Báo cáo',    roles: ['ADMIN'] },
  { to: '/payments',   icon: '💳', label: 'Thanh toán',  roles: ['ADMIN', 'OPERATOR', 'STUDENT', 'STAFF'] },
  { to: '/gate',       icon: '🎫', label: 'Vé tạm thời', roles: ['ADMIN', 'OPERATOR'] },
  { to: '/admin',      icon: '👥', label: 'Người dùng',  roles: ['ADMIN', 'OPERATOR'] },
  { to: '/settings',   icon: '⚙️', label: 'Cài đặt',    roles: ['ADMIN'] },
];

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Quản trị viên', OPERATOR: 'Nhân viên', STUDENT: 'Sinh viên', STAFF: 'Cán bộ',
};

export default function Layout() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [width, setWidth] = useState(window.innerWidth);
  const location = useLocation();

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const isMobile = width < 768;
  const role = user?.role ?? '';

  const visibleItems = NAV_ITEMS.filter(item =>
    !item.roles || item.roles.includes(role)
  );

  // Payment route: ADMIN/OPERATOR → /payments (admin view), STUDENT/STAFF → /portal (personal)
  const paymentTo = (role === 'STUDENT' || role === 'STAFF') ? '/portal' : '/payments';
  const items = visibleItems.map(item =>
    item.to === '/payments' ? { ...item, to: paymentTo } : item
  );

  const initials = user?.fullName?.split(' ').map((w: string) => w[0]).slice(-2).join('').toUpperCase() || '?';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f1117', color: '#e2e8f0',
      fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: 13 }}>

      {/* Mobile toggle */}
      {isMobile && (
        <button onClick={() => setMobileOpen(!mobileOpen)} style={{
          position: 'fixed', top: 12, left: 12, zIndex: 1000,
          width: 36, height: 36, borderRadius: 8, background: '#1c2333',
          border: '1px solid #2a3650', color: '#e2e8f0', cursor: 'pointer', fontSize: 16,
        }}>☰</button>
      )}

      {/* Sidebar */}
      <aside style={{
        width: 210, background: '#161b27', borderRight: '1px solid #2a3650',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
        position: isMobile ? 'fixed' : 'static', height: isMobile ? '100vh' : '100vh',
        transform: isMobile ? `translateX(${mobileOpen ? 0 : -100}%)` : 'none',
        transition: 'transform .3s', zIndex: 999, overflowY: 'auto',
      }}>
        {/* Brand */}
        <div style={{ padding: '16px 14px', display: 'flex', alignItems: 'center', gap: 10,
          borderBottom: '1px solid #2a3650', flexShrink: 0 }}>
          <div style={{ width: 34, height: 34, background: '#3b82f6', borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, color: '#fff', fontSize: 15, flexShrink: 0 }}>P</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Smart Parking</div>
            <div style={{ fontSize: 10, color: '#64748b' }}>HCMUT</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 8px' }}>
          {items.map(item => (
            <NavLink key={item.to} to={item.to}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '9px 10px', borderRadius: 8, marginBottom: 2,
                color: isActive ? '#fff' : '#64748b',
                background: isActive ? '#3b82f6' : 'transparent',
                textDecoration: 'none', fontSize: 13, transition: '.15s',
                fontWeight: isActive ? 600 : 400,
              })}>
              <span style={{ fontSize: 14, width: 18, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User + logout */}
        <div style={{ padding: '12px 14px', borderTop: '1px solid #2a3650', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#3b82f6', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>
              {initials}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.fullName}
              </div>
              <div style={{ fontSize: 10, color: '#64748b' }}>{ROLE_LABEL[role] || role}</div>
            </div>
          </div>
          <button onClick={logout} style={{
            width: '100%', padding: '7px 10px', background: 'transparent',
            border: '1px solid #2a3650', borderRadius: 7, color: '#94a3b8',
            cursor: 'pointer', fontSize: 11, fontFamily: 'inherit',
          }}>Đăng xuất</button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: isMobile ? '60px 14px 20px' : '24px 28px', overflowX: 'auto', minWidth: 0 }}>
        <Outlet />
      </main>

      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <div onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 998 }} />
      )}
    </div>
  );
}
