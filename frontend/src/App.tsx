import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage       from './pages/LoginPage';
import Layout          from './components/Layout';
import DashboardPage   from './pages/DashboardPage';
import ParkingMapPage  from './pages/ParkingMapPage';
import ReportsPage     from './pages/ReportsPage';
import PaymentAdminPage from './pages/PaymentAdminPage';
import UserPortal      from './pages/UserPortal';
import GateControl     from './pages/GateControl';
import AdminPage       from './pages/AdminPage';

function Guard({ children, roles }: { children: any; roles?: string[] }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 40, color: '#64748b' }}>Đang tải...</div>;
  if (!user)   return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<Guard><Layout /></Guard>}>
            <Route path="/"          element={<HomeRedirect />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/map"       element={<ParkingMapPage />} />

            {/* Báo cáo – Admin only */}
            <Route path="/reports" element={
              <Guard roles={['ADMIN']}><ReportsPage /></Guard>
            } />

            {/* Thanh toán admin – Admin/Operator */}
            <Route path="/payments" element={
              <Guard roles={['ADMIN', 'OPERATOR']}><PaymentAdminPage /></Guard>
            } />

            {/* Thanh toán cá nhân – Student/Staff */}
            <Route path="/portal" element={
              <Guard roles={['STUDENT', 'STAFF']}><UserPortal /></Guard>
            } />

            {/* Vé tạm thời – Operator/Admin */}
            <Route path="/gate" element={
              <Guard roles={['ADMIN', 'OPERATOR']}><GateControl /></Guard>
            } />

            {/* Người dùng + cài đặt – Admin/Operator */}
            <Route path="/admin" element={
              <Guard roles={['ADMIN', 'OPERATOR']}><AdminPage /></Guard>
            } />

            {/* Settings placeholder */}
            <Route path="/settings" element={
              <Guard roles={['ADMIN']}>
                <div style={{ padding: 20, color: '#64748b', fontSize: 14 }}>
                  ⚙️ Cài đặt hệ thống — sắp ra mắt
                </div>
              </Guard>
            } />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
