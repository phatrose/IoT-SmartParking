/**
 * src/pages/LoginPage.tsx
 * Mock HCMUT_SSO login screen
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

const DEMO_ACCOUNTS = [
  { hcmutId: '2211001', label: 'Nguyễn Văn An (Sinh viên)' },
  { hcmutId: 'GV-045',  label: 'TS. Phạm Minh (Giảng viên)' },
  { hcmutId: 'OP-001',  label: 'Bảo vệ' },
  { hcmutId: 'AD-001',  label: 'Admin' },
];

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const nav = useNavigate();
  const [hcmutId, setHcmutId] = useState('2211001');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(hcmutId, password);
      nav('/');
    } catch (err: any) {
      setError(err.response?.data?.message || t('login.error_invalid'));
    } finally {
      setLoading(false);
    }
  };

  const switchLang = (l: string) => i18n.changeLanguage(l);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f1117 0%, #1c2333 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Be Vietnam Pro', sans-serif", padding: 20,
    }}>
      <div style={{
        background: '#1c2333', border: '1px solid #2a3650', borderRadius: 12,
        padding: 32, width: '100%', maxWidth: 420, boxShadow: '0 16px 40px rgba(0,0,0,.5)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, background: '#3b82f6', borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 auto 12px',
          }}>P</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>HCMUT IoT-SPMS</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{t('login.title')}</div>
        </div>

        {/* Lang toggle */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 20 }}>
          {['vi', 'en'].map(l => (
            <button key={l} onClick={() => switchLang(l)} style={{
              padding: '5px 12px', borderRadius: 7, fontSize: 11, cursor: 'pointer',
              background: i18n.language === l ? '#3b82f6' : 'transparent',
              border: '1px solid #2a3650',
              color: i18n.language === l ? '#fff' : '#94a3b8',
              fontWeight: i18n.language === l ? 600 : 400,
            }}>{l === 'vi' ? '🇻🇳 VI' : '🇺🇸 EN'}</button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: '#94a3b8', marginBottom: 5, display: 'block' }}>
              {t('login.hcmut_id')}
            </label>
            <input
              value={hcmutId}
              onChange={e => setHcmutId(e.target.value)}
              required
              style={{
                width: '100%', background: '#222b3a', border: '1px solid #2a3650',
                borderRadius: 7, padding: '10px 12px', color: '#e2e8f0',
                fontSize: 13, outline: 'none', fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 11, color: '#94a3b8', marginBottom: 5, display: 'block' }}>
              {t('login.password')}
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                width: '100%', background: '#222b3a', border: '1px solid #2a3650',
                borderRadius: 7, padding: '10px 12px', color: '#e2e8f0',
                fontSize: 13, outline: 'none', fontFamily: 'inherit',
              }}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)',
              borderRadius: 7, padding: 10, fontSize: 12, color: '#ef4444',
              marginBottom: 14,
            }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: 11, borderRadius: 8,
              background: loading ? '#374151' : '#3b82f6',
              color: '#fff', border: 'none', fontSize: 13, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            }}
          >
            {loading ? t('login.loading') : t('login.submit')}
          </button>
        </form>

        {/* Demo accounts */}
        <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid #2a3650' }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10, textAlign: 'center' }}>
            {t('login.demo_accounts')} (mật khẩu: <code>123456</code>)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {DEMO_ACCOUNTS.map(a => (
              <button
                key={a.hcmutId}
                type="button"
                onClick={() => { setHcmutId(a.hcmutId); setPassword('123456'); }}
                style={{
                  padding: '6px 10px', borderRadius: 6, background: '#222b3a',
                  border: '1px solid #2a3650', color: '#94a3b8', fontSize: 11,
                  cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  display: 'flex', justifyContent: 'space-between',
                }}
              >
                <span style={{ color: '#3b82f6', fontFamily: 'monospace' }}>{a.hcmutId}</span>
                <span>{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
