import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../services/api';
import { useToast } from '../components/Toast';

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
const ROLES = ['STUDENT', 'STAFF', 'OPERATOR', 'ADMIN'];

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#0f1117', border: '1px solid #2a3650',
  borderRadius: 7, padding: '9px 12px', color: '#e2e8f0', fontSize: 13,
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
};

export default function AdminPage() {
  const { toast } = useToast();
  const [tab, setTab]         = useState<'users' | 'pricing' | 'log'>('users');
  const [users, setUsers]     = useState<any[]>([]);
  const [pricing, setPricing] = useState<any[]>([]);
  const [log, setLog]         = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);
  const [lastSync, setLastSync] = useState('');

  // Modal states
  const [modal, setModal] = useState<'create' | 'edit' | 'delete' | 'reset' | null>(null);
  const [targetUser, setTargetUser] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [u, p, l] = await Promise.all([
        adminApi.getUsers(), adminApi.getPricing(), adminApi.getLogs({ limit: 50 }),
      ]);
      setUsers(u.data); setPricing(p.data); setLog(l.data);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm({ role: 'STUDENT', password: '123456' });
    setTargetUser(null);
    setModal('create');
  };

  const openEdit = (u: any) => {
    setForm({ fullName: u.fullName, email: u.email, phone: u.phone,
      licensePlate: u.licensePlate, department: u.department,
      isActive: u.isActive, role: u.role });
    setTargetUser(u);
    setModal('edit');
  };

  const openDelete  = (u: any) => { setTargetUser(u); setModal('delete'); };
  const openReset   = (u: any) => { setTargetUser(u); setForm({ newPassword: '123456' }); setModal('reset'); };
  const closeModal  = () => { setModal(null); setTargetUser(null); setForm({}); };

  const handleCreate = async () => {
    if (!form.hcmutId || !form.fullName || !form.password) {
      toast('Vui lòng điền đủ thông tin bắt buộc', 'warning'); return;
    }
    setSaving(true);
    try {
      await adminApi.createUser(form);
      toast(`Đã tạo user ${form.hcmutId}`, 'success');
      closeModal(); load();
    } catch (e: any) {
      toast(e.response?.data?.message || 'Lỗi tạo user', 'error');
    } finally { setSaving(false); }
  };

  const handleEdit = async () => {
    setSaving(true);
    try {
      await adminApi.updateUser(targetUser.id, form);
      toast('Cập nhật thành công', 'success');
      closeModal(); load();
    } catch (e: any) {
      toast(e.response?.data?.message || 'Lỗi cập nhật', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await adminApi.deleteUser(targetUser.id);
      toast(`Đã vô hiệu hóa ${targetUser.hcmutId}`, 'success');
      closeModal(); load();
    } catch (e: any) {
      toast(e.response?.data?.message || 'Lỗi', 'error');
    } finally { setSaving(false); }
  };

  const handleReset = async () => {
    if (!form.newPassword || form.newPassword.length < 6) {
      toast('Mật khẩu tối thiểu 6 ký tự', 'warning'); return;
    }
    setSaving(true);
    try {
      await adminApi.resetPassword(targetUser.id, form.newPassword);
      toast('Reset mật khẩu thành công', 'success');
      closeModal();
    } catch (e: any) {
      toast(e.response?.data?.message || 'Lỗi reset', 'error');
    } finally { setSaving(false); }
  };

  const savePricing = async (p: any) => {
    try {
      await adminApi.upsertPricing({ user_role: p.userRole, rate_per_hour: Number(p.ratePerHour), daily_cap: Number(p.dailyCap), is_exempt: p.isExempt });
      toast('Đã lưu bảng giá', 'success');
      load();
    } catch { toast('Lỗi lưu giá', 'error'); }
  };

  const sync = async () => {
    setSyncing(true);
    try {
      await adminApi.syncDatacore();
      const now = new Date().toLocaleString('vi-VN');
      setLastSync(now);
      toast('Đồng bộ DATACORE thành công', 'success');
      load();
    } catch { toast('Lỗi đồng bộ', 'error'); }
    finally { setSyncing(false); }
  };

  const exportCSV = () => {
    const rows = ['Time,Type,User,Description,Status',
      ...log.map(l => `"${l.createdAt}","${l.eventType}","${l.userName||''}","${l.description.replace(/"/g,'""')}","${l.status}"`)];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `SPMS_Log_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  const filtered = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.fullName?.toLowerCase().includes(q) || u.hcmutId?.toLowerCase().includes(q) || u.licensePlate?.toLowerCase().includes(q);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageUsers  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
        {tab === 'users' ? 'Quản lý người dùng' : tab === 'pricing' ? 'Cấu hình giá' : 'System Log'}
      </h1>
      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
        {tab === 'users' ? 'Thêm, sửa, xóa và quản lý tài khoản trong hệ thống' : tab === 'pricing' ? 'Thiết lập giá đỗ xe theo vai trò' : 'Nhật ký hoạt động hệ thống'}
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#1c2333',
        border: '1px solid #2a3650', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {([['users','Người dùng'],['pricing','Bảng giá'],['log','System Log']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            padding: '7px 20px', borderRadius: 7, fontSize: 12, fontFamily: 'inherit',
            background: tab === k ? '#3b82f6' : 'transparent',
            color: tab === k ? '#fff' : '#64748b', border: 'none',
            cursor: 'pointer', fontWeight: tab === k ? 600 : 400,
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
                <div style={{ fontSize: 13, fontWeight: 600 }}>Đồng bộ HCMUT_DATACORE</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Cập nhật lần cuối: {lastSync || 'Chưa đồng bộ'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={openCreate} style={{
                padding: '9px 18px', borderRadius: 8, background: '#22c55e',
                color: '#fff', border: 'none', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit' }}>+ Thêm người dùng</button>
              <button onClick={sync} disabled={syncing} style={{
                padding: '9px 18px', borderRadius: 8, background: syncing ? '#374151' : '#3b82f6',
                color: '#fff', border: 'none', fontSize: 12, fontWeight: 600,
                cursor: syncing ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {syncing ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}
              </button>
            </div>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#64748b' }}>🔍</span>
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Tìm theo tên, mã SV, biển số..."
              style={{ width: '100%', background: '#1c2333', border: '1px solid #2a3650', borderRadius: 8,
                padding: '10px 12px 10px 36px', color: '#e2e8f0', fontSize: 12,
                outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>

          {/* Table */}
          <div style={{ background: '#1c2333', border: '1px solid #2a3650', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Người dùng','Mã SV','Vai trò','Biển số xe','Số dư','Trạng thái','Hành động'].map(h => (
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
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#3b82f6',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials}</div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{u.fullName}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>{u.email || u.phone || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12 }}>{u.hcmutId}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12 }}>{ROLE_LABELS[u.role] || u.role}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12 }}>{u.licensePlate || '—'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontWeight: 700, color: u.balance > 0 ? '#f59e0b' : '#22c55e', fontSize: 13 }}>
                          {u.balance > 0 ? `-${Number(u.balance).toLocaleString('vi-VN')}đ` : '0đ'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                          background: st.bg, color: st.color }}>{st.label}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <ActionBtn label="✏" title="Sửa" color="#3b82f6" onClick={() => openEdit(u)} />
                          <ActionBtn label="🔑" title="Reset mật khẩu" color="#f59e0b" onClick={() => openReset(u)} />
                          <ActionBtn label="🗑" title="Vô hiệu hóa" color="#ef4444" onClick={() => openDelete(u)} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div style={{ padding: '12px 16px', borderTop: '1px solid #2a3650',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                {Math.min((page-1)*PAGE_SIZE+1, filtered.length)}–{Math.min(page*PAGE_SIZE, filtered.length)} / {filtered.length} người dùng
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                <PagBtn label="‹" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} />
                {Array.from({ length: totalPages }, (_, i) => i+1).map(n => (
                  <PagBtn key={n} label={n.toString()} onClick={() => setPage(n)} active={n===page} />
                ))}
                <PagBtn label="›" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── PRICING TAB ─── */}
      {tab === 'pricing' && (
        <div style={{ background: '#1c2333', border: '1px solid #2a3650', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #2a3650', fontWeight: 600, fontSize: 14 }}>Cấu hình bảng giá</div>
          <div style={{ padding: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12 }}>
              {pricing.filter(p => !p.isExempt).map(p => (
                <div key={p.id} style={{ background: '#222b3a', border: '1px solid #2a3650', borderRadius: 10, padding: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{ROLE_LABELS[p.userRole] || p.userRole}</div>
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
              ✅ Giảng viên và cán bộ (STAFF/OPERATOR/ADMIN) được miễn phí gửi xe
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
              <div key={l.id} style={{ padding: '10px 16px', borderBottom: '1px solid rgba(42,54,80,.4)', display: 'flex', gap: 10 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%',
                  background: TYPE_COLOR[l.eventType] || '#3b82f6', marginTop: 5, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>
                    [{new Date(l.createdAt).toLocaleString('vi-VN')}] {l.eventType}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 2 }}><strong>{l.userName || '-'}:</strong> {l.description}</div>
                </div>
                <span style={{ padding: '2px 7px', borderRadius: 20, fontSize: 10, flexShrink: 0,
                  background: l.status==='OK' ? 'rgba(34,197,94,.15)' : 'rgba(245,158,11,.15)',
                  color: l.status==='OK' ? '#22c55e' : '#f59e0b' }}>{l.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── MODALS ─── */}
      {modal && (
        <div onClick={closeModal} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#1c2333', border: '1px solid #2a3650', borderRadius: 14,
            padding: 24, width: 440, maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto',
          }}>
            {/* CREATE */}
            {modal === 'create' && <>
              <ModalHeader title="Thêm người dùng mới" onClose={closeModal} />
              <MField label="Mã HCMUT *"><input style={inputStyle} value={form.hcmutId||''} onChange={e=>setForm({...form,hcmutId:e.target.value})} placeholder="VD: 2211001" /></MField>
              <MField label="Họ tên *"><input style={inputStyle} value={form.fullName||''} onChange={e=>setForm({...form,fullName:e.target.value})} placeholder="Nguyễn Văn A" /></MField>
              <MField label="Vai trò *">
                <select style={inputStyle} value={form.role||'STUDENT'} onChange={e=>setForm({...form,role:e.target.value})}>
                  {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </MField>
              <MField label="Mật khẩu *"><input style={inputStyle} type="password" value={form.password||''} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Tối thiểu 6 ký tự" /></MField>
              <MField label="Email"><input style={inputStyle} value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})} placeholder="email@hcmut.edu.vn" /></MField>
              <MField label="Số điện thoại"><input style={inputStyle} value={form.phone||''} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="0912345678" /></MField>
              <MField label="Biển số xe"><input style={inputStyle} value={form.licensePlate||''} onChange={e=>setForm({...form,licensePlate:e.target.value})} placeholder="29A-12345" /></MField>
              <MField label="Khoa / Bộ môn"><input style={inputStyle} value={form.department||''} onChange={e=>setForm({...form,department:e.target.value})} placeholder="Khoa KTMT" /></MField>
              <ModalActions onCancel={closeModal} onConfirm={handleCreate} saving={saving} confirmLabel="Tạo tài khoản" confirmColor="#22c55e" />
            </>}

            {/* EDIT */}
            {modal === 'edit' && <>
              <ModalHeader title={`Sửa: ${targetUser?.hcmutId}`} onClose={closeModal} />
              <MField label="Họ tên"><input style={inputStyle} value={form.fullName||''} onChange={e=>setForm({...form,fullName:e.target.value})} /></MField>
              <MField label="Vai trò">
                <select style={inputStyle} value={form.role||''} onChange={e=>setForm({...form,role:e.target.value})}>
                  {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </MField>
              <MField label="Email"><input style={inputStyle} value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})} /></MField>
              <MField label="Số điện thoại"><input style={inputStyle} value={form.phone||''} onChange={e=>setForm({...form,phone:e.target.value})} /></MField>
              <MField label="Biển số xe"><input style={inputStyle} value={form.licensePlate||''} onChange={e=>setForm({...form,licensePlate:e.target.value})} /></MField>
              <MField label="Khoa / Bộ môn"><input style={inputStyle} value={form.department||''} onChange={e=>setForm({...form,department:e.target.value})} /></MField>
              <MField label="Trạng thái">
                <select style={inputStyle} value={String(form.isActive)} onChange={e=>setForm({...form,isActive:e.target.value==='true'})}>
                  <option value="true">Hoạt động</option>
                  <option value="false">Bị khóa</option>
                </select>
              </MField>
              <ModalActions onCancel={closeModal} onConfirm={handleEdit} saving={saving} confirmLabel="Lưu thay đổi" confirmColor="#3b82f6" />
            </>}

            {/* DELETE */}
            {modal === 'delete' && <>
              <ModalHeader title="Vô hiệu hóa tài khoản" onClose={closeModal} />
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
                <div style={{ fontSize: 14, marginBottom: 8 }}>
                  Vô hiệu hóa tài khoản <strong>{targetUser?.fullName}</strong>?
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  ({targetUser?.hcmutId}) — Tài khoản sẽ bị khóa, không thể đăng nhập.
                </div>
              </div>
              <ModalActions onCancel={closeModal} onConfirm={handleDelete} saving={saving} confirmLabel="Vô hiệu hóa" confirmColor="#ef4444" />
            </>}

            {/* RESET PASSWORD */}
            {modal === 'reset' && <>
              <ModalHeader title={`Reset mật khẩu: ${targetUser?.hcmutId}`} onClose={closeModal} />
              <MField label="Mật khẩu mới *">
                <input style={inputStyle} type="text" value={form.newPassword||''} onChange={e=>setForm({...form,newPassword:e.target.value})} placeholder="Tối thiểu 6 ký tự" />
              </MField>
              <ModalActions onCancel={closeModal} onConfirm={handleReset} saving={saving} confirmLabel="Reset mật khẩu" confirmColor="#f59e0b" />
            </>}
          </div>
        </div>
      )}
    </div>
  );
}

function ActionBtn({ label, title, color, onClick }: { label: string; title: string; color: string; onClick: () => void }) {
  return (
    <button title={title} onClick={onClick} style={{
      width: 30, height: 30, borderRadius: 6, background: `${color}15`,
      border: `1px solid ${color}30`, cursor: 'pointer', fontSize: 13,
    }}>{label}</button>
  );
}

function PagBtn({ label, onClick, disabled, active }: { label: string; onClick: () => void; disabled?: boolean; active?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      minWidth: 32, height: 32, borderRadius: 7, border: '1px solid',
      borderColor: active ? '#3b82f6' : '#2a3650',
      background: active ? '#3b82f6' : '#1c2333',
      color: active ? '#fff' : disabled ? '#374151' : '#94a3b8',
      fontSize: 12, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
    }}>{label}</button>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
      <span style={{ fontSize: 16, fontWeight: 700 }}>{title}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 20, cursor: 'pointer' }}>✕</button>
    </div>
  );
}

function MField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

function ModalActions({ onCancel, onConfirm, saving, confirmLabel, confirmColor }: {
  onCancel: () => void; onConfirm: () => void; saving: boolean; confirmLabel: string; confirmColor: string;
}) {
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
      <button onClick={onCancel} style={{ flex: 1, padding: '10px', borderRadius: 8,
        background: '#222b3a', border: '1px solid #2a3650', color: '#94a3b8',
        fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Hủy</button>
      <button onClick={onConfirm} disabled={saving} style={{ flex: 1, padding: '10px', borderRadius: 8,
        background: saving ? '#374151' : confirmColor, border: 'none', color: '#fff',
        fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
        {saving ? 'Đang xử lý...' : confirmLabel}
      </button>
    </div>
  );
}
