import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../services/api';

const TYPE_COLOR: Record<string, string> = {
  entry: '#22c55e', exit: '#f59e0b', payment: '#3b82f6',
  visitor: '#3b82f6', fault: '#f59e0b', admin: '#8b5cf6',
};

const ROLE_LABELS: Record<string, string> = {
  STUDENT: 'Sinh viên', STAFF: 'Cán bộ', OPERATOR: 'Nhân viên', ADMIN: 'Quản trị viên',
};
const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  ACTIVE:  { bg: 'rgba(34,197,94,.15)',  color: '#22c55e', label: 'Hoạt động' },
  WARNING: { bg: 'rgba(245,158,11,.15)', color: '#f59e0b', label: 'Cảnh báo'  },
  BLOCKED: { bg: 'rgba(239,68,68,.15)',  color: '#ef4444', label: 'Bị khóa'   },
};
const PAGE_SIZE = 5;

export default function AdminPage() {
  const [tab, setTab]     = useState<'users' | 'pricing' | 'log'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any[]>([]);
  const [log, setLog]     = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);
  const [lastSync, setLastSync] = useState('');

  const load = useCallback(async () => {
    try {
      const [u, p, l] = await Promise.all([
        adminApi.getUsers(), adminApi.getPricing(), adminApi.getLogs({ limit: 50 }),
      ]);
      setUsers(u.data); setPricing(p.data); setLog(l.data);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const savePricing = async (p: any) => {
    await adminApi.upsertPricing({ user_role: p.userRole, rate_per_hour: Number(p.ratePerHour), daily_cap: Number(p.dailyCap), is_exempt: p.isExempt });
    load();
  };

  const sync = async () => {
    setSyncing(true);
    try {
      await adminApi.syncDatacore();
      const now = new Date().toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
      setLastSync(now);
      load();
    } finally { setSyncing(false); }
  };

  const exportCSV = () => {
    const rows = ['Time,Type,User,Description,Status',
      ...log.map(l => `"${l.createdAt}","${l.eventType}","${l.userName||''}","${l.description.replace(/"/g,'""')}","${l.status}"`)];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `SPMS_Log_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  // Filtered + paginated users
  const filtered = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.fullName?.toLowerCase().includes(q) || u.hcmutId?.toLowerCase().includes(q) || u.licensePlate?.toLowerCase().includes(q);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageUsers  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const TYPE_COLOR: Record<string, string> = {
    entry: '#22c55e', exit: '#f59e0b', payment: '#3b82f6',
    visitor: '#3b82f6', fault: '#f59e0b', admin: '#8b5cf6',
  };

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
        {tab === 'users' ? 'Users Management' : tab === 'pricing' ? 'Cấu hình giá' : 'System Log'}
      </h1>
      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
        {tab === 'users' ? 'Quản lý người dùng hệ thống' : tab === 'pricing' ? 'Thiết lập giá đỗ xe' : 'Nhật ký hệ thống'}
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#1c2333',
        border: '1px solid #2a3650', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[['users','Người dùng'],['pricing','Bảng giá'],['log','System Log']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k as any)} style={{
            padding: '7px 20px', borderRadius: 7, fontSize: 12, fontFamily: 'inherit',
            background: tab === k ? '#3b82f6' : 'transparent',
            color: tab === k ? '#fff' : '#64748b', border: 'none',
            cursor: 'pointer', fontWeight: tab === k ? 600 : 400, transition: '.15s',
          }}>{l}</button>
        ))}
      </div>

      {/* ─── USERS TAB ─── */}
      {tab === 'users' && (
        <div>
          {/* Sync banner */}
          <div style={{ background: 'linear-gradient(90deg,rgba(59,130,246,.2),rgba(59,130,246,.08))',
            border: '1px solid rgba(59,130,246,.3)', borderRadius: 12,
            padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>🔄</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Đồng bộ dữ liệu</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  Cập nhật lần cuối: {lastSync || 'Chưa đồng bộ'}
                </div>
              </div>
            </div>
            <button onClick={sync} disabled={syncing} style={{
              padding: '9px 18px', borderRadius: 8, background: syncing ? '#374151' : '#3b82f6',
              color: '#fff', border: 'none', fontSize: 12, fontWeight: 600,
              cursor: syncing ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            }}>{syncing ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}</button>
          </div>

          {/* Search + filter bar */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                fontSize: 14, color: '#64748b' }}>🔍</span>
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Tìm kiếm theo tên, mã SV, biển số..."
                style={{ width: '100%', background: '#1c2333', border: '1px solid #2a3650', borderRadius: 8,
                  padding: '10px 12px 10px 36px', color: '#e2e8f0', fontSize: 12,
                  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>
            <select style={{ background: '#1c2333', border: '1px solid #2a3650', borderRadius: 8,
              padding: '10px 14px', color: '#e2e8f0', fontSize: 12, outline: 'none', fontFamily: 'inherit' }}>
              <option>Tất cả trạng thái</option>
              <option>Hoạt động</option><option>Cảnh báo</option><option>Bị khóa</option>
            </select>
            <button style={{ background: '#1c2333', border: '1px solid #2a3650', borderRadius: 8,
              padding: '10px 14px', color: '#64748b', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
              🔽 Lọc nâng cao
            </button>
          </div>

          {/* Table */}
          <div style={{ background: '#1c2333', border: '1px solid #2a3650', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Sinh viên','Mã SV','Liên hệ','Biển số xe','Số dư','Trạng thái','Hành động'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11,
                      color: '#64748b', borderBottom: '1px solid #2a3650', fontWeight: 500,
                      textTransform: 'uppercase', letterSpacing: .4 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageUsers.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
                    Không tìm thấy người dùng
                  </td></tr>
                ) : pageUsers.map(u => {
                  const st = STATUS_STYLE[u.status] ?? STATUS_STYLE['ACTIVE'];
                  const initials = u.fullName?.split(' ').map((w: string) => w[0]).slice(-2).join('').toUpperCase() || '?';
                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(42,54,80,.4)' }}>
                      {/* Sinh viên */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#3b82f6',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials}</div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{u.fullName}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      {/* Mã SV */}
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 12 }}>{u.hcmutId}</td>
                      {/* Liên hệ */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontSize: 12, color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span>✉ {u.email}</span>
                          {u.phone && <span>📞 {u.phone}</span>}
                        </div>
                      </td>
                      {/* Biển số */}
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 12 }}>
                        {u.licensePlate || '—'}
                      </td>
                      {/* Số dư */}
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontWeight: 700, color: u.balance > 0 ? '#f59e0b' : '#22c55e', fontSize: 13 }}>
                          {u.balance > 0 ? `-${Number(u.balance).toLocaleString('vi-VN')}đ` : '0đ'}
                        </span>
                      </td>
                      {/* Trạng thái */}
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                          background: st.bg, color: st.color }}>{st.label}</span>
                      </td>
                      {/* Hành động */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <button title="Chỉnh sửa" style={actionBtn('#3b82f6')}>✏️</button>
                          <button title="Xóa" style={actionBtn('#ef4444')}>🗑️</button>
                          <button title="Thêm" style={actionBtn('#64748b')}>⋮</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid #2a3650',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                Hiển thị {Math.min((page-1)*PAGE_SIZE+1, filtered.length)}–{Math.min(page*PAGE_SIZE, filtered.length)} của {filtered.length} người dùng
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                <PagBtn label="Trước" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} />
                {Array.from({ length: totalPages }, (_, i) => i+1).map(n => (
                  <PagBtn key={n} label={n.toString()} onClick={() => setPage(n)} active={n===page} />
                ))}
                <PagBtn label="Sau" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── PRICING TAB ─── */}
      {tab === 'pricing' && (
        <div style={{ background: '#1c2333', border: '1px solid #2a3650', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #2a3650', fontWeight: 600, fontSize: 14 }}>
            Cấu hình bảng giá
          </div>
          <div style={{ padding: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12 }}>
              {pricing.filter(p => !p.isExempt).map(p => (
                <div key={p.id} style={{ background: '#222b3a', border: '1px solid #2a3650', borderRadius: 10, padding: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
                    {ROLE_LABELS[p.userRole] || p.userRole}
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Giá/giờ (VNĐ)</label>
                    <input type="number" defaultValue={Number(p.ratePerHour)}
                      onBlur={e => savePricing({ ...p, ratePerHour: e.target.value })}
                      style={{ width: '100%', background: '#1c2333', border: '1px solid #2a3650',
                        borderRadius: 6, padding: '8px 10px', color: '#e2e8f0', fontSize: 12,
                        fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Giới hạn ngày (VNĐ)</label>
                    <input type="number" defaultValue={Number(p.dailyCap)}
                      onBlur={e => savePricing({ ...p, dailyCap: e.target.value })}
                      style={{ width: '100%', background: '#1c2333', border: '1px solid #2a3650',
                        borderRadius: 6, padding: '8px 10px', color: '#e2e8f0', fontSize: 12,
                        fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, padding: 12, background: 'rgba(34,197,94,.08)',
              border: '1px solid rgba(34,197,94,.2)', borderRadius: 8, fontSize: 12, color: '#22c55e' }}>
              ✅ Giảng viên và khách EXEMPT được miễn phí gửi xe
            </div>
          </div>
        </div>
      )}

      {/* ─── LOG TAB ─── */}
      {tab === 'log' && (
        <div style={{ background: '#1c2333', border: '1px solid #2a3650', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #2a3650',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>System Log</span>
            <button onClick={exportCSV} style={{ padding: '7px 14px', borderRadius: 7, background: '#22c55e',
              color: '#fff', border: 'none', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
              📥 Xuất CSV
            </button>
          </div>
          <div style={{ maxHeight: 500, overflowY: 'auto' }}>
            {log.map(l => (
              <div key={l.id} style={{ padding: '10px 16px', borderBottom: '1px solid rgba(42,54,80,.4)',
                display: 'flex', gap: 10 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%',
                  background: TYPE_COLOR[l.eventType] || '#3b82f6', marginTop: 5, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>
                    [{new Date(l.createdAt).toLocaleString('vi-VN')}] {l.eventType}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 2 }}>
                    <strong>{l.userName || '-'}:</strong> {l.description}
                  </div>
                </div>
                <span style={{ padding: '2px 7px', borderRadius: 20, fontSize: 10, flexShrink: 0,
                  background: l.status==='OK' ? 'rgba(34,197,94,.15)' : 'rgba(245,158,11,.15)',
                  color: l.status==='OK' ? '#22c55e' : '#f59e0b' }}>{l.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function actionBtn(color: string): React.CSSProperties {
  return {
    width: 28, height: 28, borderRadius: 6, background: `${color}15`,
    border: `1px solid ${color}30`, cursor: 'pointer', fontSize: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  } as any;
}

function PagBtn({ label, onClick, disabled, active }: { label: string; onClick: () => void; disabled?: boolean; active?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      minWidth: 34, height: 34, borderRadius: 7, border: '1px solid',
      borderColor: active ? '#3b82f6' : '#2a3650',
      background: active ? '#3b82f6' : '#1c2333',
      color: active ? '#fff' : disabled ? '#374151' : '#94a3b8',
      fontSize: 12, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
    }}>{label}</button>
  );
}
