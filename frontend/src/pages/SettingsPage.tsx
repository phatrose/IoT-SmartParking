import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

type Section = 'account' | 'notifications' | 'display' | 'parking' | 'about';

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!value)}
      style={{ width: 42, height: 24, borderRadius: 12, cursor: 'pointer', transition: 'background .2s',
        background: value ? '#3b82f6' : '#374151', position: 'relative', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 3, transition: 'left .2s',
        left: value ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff' }} />
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ background: '#222b3a', border: '1px solid #2a3650', borderRadius: 8,
        padding: '7px 12px', color: '#e2e8f0', fontSize: 13, fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '14px 0', borderBottom: '1px solid rgba(42,54,80,.4)', gap: 16 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{desc}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#1c2333', border: '1px solid #2a3650', borderRadius: 12, padding: '20px 22px', marginBottom: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{title}</div>
      <div style={{ height: 1, background: '#2a3650', margin: '12px 0' }} />
      {children}
    </div>
  );
}

const MENU: { key: Section; icon: string; label: string }[] = [
  { key: 'account',       icon: '👤', label: 'Tài khoản' },
  { key: 'notifications', icon: '🔔', label: 'Thông báo' },
  { key: 'display',       icon: '🎨', label: 'Hiển thị' },
  { key: 'parking',       icon: '🅿',  label: 'Bãi xe' },
  { key: 'about',         icon: 'ℹ',  label: 'Về hệ thống' },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const [section, setSection] = useState<Section>('account');

  // Account
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');

  // Notifications
  const [notif, setNotif] = useState({
    sound:    true,
    iotFault: true,
    payment:  false,
    email:    false,
    barrier:  true,
  });

  // Display
  const [lang,        setLang]        = useState('vi');
  const [timeFormat,  setTimeFormat]  = useState('24h');
  const [refreshRate, setRefreshRate] = useState('4');
  const [dateFormat,  setDateFormat]  = useState('dd/mm/yyyy');

  // Parking
  const [slaBarrier,  setSlaBarrier]  = useState('2');
  const [slaIot,      setSlaIot]      = useState('5');
  const [autoLogout,  setAutoLogout]  = useState('30');
  const [maxReserve,  setMaxReserve]  = useState('60');

  const savePwd = () => {
    if (!oldPwd || !newPwd) { setPwdMsg('Vui lòng điền đầy đủ'); return; }
    if (newPwd.length < 6)  { setPwdMsg('Mật khẩu mới tối thiểu 6 ký tự'); return; }
    setPwdMsg('✅ Đã lưu (mock)');
    setOldPwd(''); setNewPwd('');
    setTimeout(() => setPwdMsg(''), 3000);
  };

  const roleLabel: Record<string, string> = {
    ADMIN: 'Quản trị viên', OPERATOR: 'Bảo vệ / Vận hành',
    STUDENT: 'Sinh viên', STAFF: 'Cán bộ / Giảng viên',
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20, maxWidth: 860 }}>

      {/* ── Sidebar ── */}
      <div style={{ background: '#1c2333', border: '1px solid #2a3650', borderRadius: 12, padding: 10, height: 'fit-content' }}>
        <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, padding: '6px 10px', marginBottom: 4 }}>
          Cài đặt
        </div>
        {MENU.map(m => (
          <div key={m.key} onClick={() => setSection(m.key)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8,
              cursor: 'pointer', fontSize: 13, fontWeight: section === m.key ? 600 : 400,
              background: section === m.key ? 'rgba(59,130,246,.12)' : 'transparent',
              color: section === m.key ? '#3b82f6' : '#94a3b8', marginBottom: 2 }}>
            <span style={{ fontSize: 16 }}>{m.icon}</span>
            {m.label}
          </div>
        ))}
      </div>

      {/* ── Content ── */}
      <div>

        {/* ── ACCOUNT ── */}
        {section === 'account' && <>
          <Card title="Thông tin tài khoản">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 0 16px' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, flexShrink: 0 }}>
                {user?.fullName?.charAt(0) ?? '?'}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{user?.fullName ?? '—'}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {roleLabel[user?.role ?? ''] ?? user?.role} · MSSV/Mã: {user?.hcmutId ?? '—'}
                </div>
              </div>
            </div>
            <Row label="Email" desc="Địa chỉ email liên kết"><span style={{ fontSize: 13, color: '#94a3b8' }}>{user?.email ?? '—'}</span></Row>
            <Row label="Khoa / Phòng ban" desc="Đơn vị công tác"><span style={{ fontSize: 13, color: '#94a3b8' }}>{(user as any)?.department ?? '—'}</span></Row>
            <Row label="Biển số xe" desc="Dùng khi cấp vé nhanh"><span style={{ fontSize: 13, color: '#94a3b8', fontFamily: 'monospace' }}>{(user as any)?.licensePlate ?? '—'}</span></Row>
            <Row label="Thẻ RFID" desc="Mã thẻ từ gắn với tài khoản"><span style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'monospace' }}>{(user as any)?.rfidCard ?? '—'}</span></Row>
          </Card>

          <Card title="Đổi mật khẩu">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4 }}>
              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Mật khẩu hiện tại</label>
                <input type="password" value={oldPwd} onChange={e => setOldPwd(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: '100%', background: '#222b3a', border: '1px solid #2a3650', borderRadius: 8,
                    padding: '10px 12px', color: '#e2e8f0', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Mật khẩu mới</label>
                <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  style={{ width: '100%', background: '#222b3a', border: '1px solid #2a3650', borderRadius: 8,
                    padding: '10px 12px', color: '#e2e8f0', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={savePwd}
                  style={{ padding: '9px 20px', borderRadius: 8, background: '#3b82f6', color: '#fff',
                    border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Lưu mật khẩu
                </button>
                {pwdMsg && <span style={{ fontSize: 12, color: pwdMsg.startsWith('✅') ? '#22c55e' : '#ef4444' }}>{pwdMsg}</span>}
              </div>
            </div>
          </Card>
        </>}

        {/* ── NOTIFICATIONS ── */}
        {section === 'notifications' && <Card title="Thông báo">
          <Row label="Âm thanh cảnh báo" desc="Phát beep khi IoT báo lỗi hoặc barrier mở">
            <Toggle value={notif.sound} onChange={v => setNotif(p => ({ ...p, sound: v }))} />
          </Row>
          <Row label="Cảnh báo cảm biến IoT" desc="Thông báo khi sensor mất kết nối hoặc lỗi">
            <Toggle value={notif.iotFault} onChange={v => setNotif(p => ({ ...p, iotFault: v }))} />
          </Row>
          <Row label="Thông báo barrier mở" desc="Hiển thị toast mỗi khi barrier kích hoạt">
            <Toggle value={notif.barrier} onChange={v => setNotif(p => ({ ...p, barrier: v }))} />
          </Row>
          <Row label="Thông báo thanh toán" desc="Cập nhật khi giao dịch BKPay hoàn tất">
            <Toggle value={notif.payment} onChange={v => setNotif(p => ({ ...p, payment: v }))} />
          </Row>
          <Row label="Gửi email" desc="Nhận báo cáo hàng tháng qua email">
            <Toggle value={notif.email} onChange={v => setNotif(p => ({ ...p, email: v }))} />
          </Row>
        </Card>}

        {/* ── DISPLAY ── */}
        {section === 'display' && <Card title="Hiển thị & Ngôn ngữ">
          <Row label="Ngôn ngữ" desc="Ngôn ngữ giao diện">
            <Select value={lang} onChange={setLang} options={[
              { value: 'vi', label: '🇻🇳 Tiếng Việt' },
              { value: 'en', label: '🇺🇸 English' },
            ]} />
          </Row>
          <Row label="Định dạng giờ" desc="Hiển thị thời gian theo 12h hoặc 24h">
            <Select value={timeFormat} onChange={setTimeFormat} options={[
              { value: '24h', label: '24h (15:30)' },
              { value: '12h', label: '12h (3:30 PM)' },
            ]} />
          </Row>
          <Row label="Định dạng ngày" desc="Thứ tự ngày tháng năm">
            <Select value={dateFormat} onChange={setDateFormat} options={[
              { value: 'dd/mm/yyyy', label: 'DD/MM/YYYY' },
              { value: 'yyyy-mm-dd', label: 'YYYY-MM-DD' },
            ]} />
          </Row>
          <Row label="Tốc độ làm mới bản đồ" desc="Tần suất cập nhật trạng thái slot IoT">
            <Select value={refreshRate} onChange={setRefreshRate} options={[
              { value: '2',  label: 'Mỗi 2 giây' },
              { value: '4',  label: 'Mỗi 4 giây' },
              { value: '10', label: 'Mỗi 10 giây' },
              { value: '30', label: 'Mỗi 30 giây' },
            ]} />
          </Row>
        </Card>}

        {/* ── PARKING ── */}
        {section === 'parking' && <Card title="Cấu hình bãi xe">
          <Row label="SLA barrier (giây)" desc="Cảnh báo nếu API mở barrier vượt ngưỡng">
            <Select value={slaBarrier} onChange={setSlaBarrier} options={[
              { value: '1', label: '< 1 giây' },
              { value: '2', label: '< 2 giây' },
              { value: '5', label: '< 5 giây' },
            ]} />
          </Row>
          <Row label="SLA cảm biến IoT (giây)" desc="Thời gian xử lý tối đa cho sự kiện sensor">
            <Select value={slaIot} onChange={setSlaIot} options={[
              { value: '2', label: '< 2 giây' },
              { value: '5', label: '< 5 giây' },
              { value: '10', label: '< 10 giây' },
            ]} />
          </Row>
          <Row label="Thời gian giữ slot đặt trước (phút)" desc="Slot tự huỷ sau bao nhiêu phút nếu chưa vào">
            <Select value={maxReserve} onChange={setMaxReserve} options={[
              { value: '30',  label: '30 phút' },
              { value: '60',  label: '60 phút' },
              { value: '120', label: '2 giờ' },
            ]} />
          </Row>
          <Row label="Tự đăng xuất sau (phút)" desc="Phiên làm việc hết hạn khi không hoạt động">
            <Select value={autoLogout} onChange={setAutoLogout} options={[
              { value: '15',  label: '15 phút' },
              { value: '30',  label: '30 phút' },
              { value: '60',  label: '60 phút' },
              { value: '0',   label: 'Không giới hạn' },
            ]} />
          </Row>

          <div style={{ marginTop: 16, padding: '12px 14px', background: 'rgba(59,130,246,.06)',
            border: '1px solid rgba(59,130,246,.2)', borderRadius: 10 }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>Chỉ tiêu SLA hiện tại</div>
            {[
              { label: 'Thời gian mở barrier',   value: `< ${slaBarrier}s`,  ok: true },
              { label: 'Xử lý cảm biến IoT',     value: `< ${slaIot}s`,      ok: true },
              { label: 'Uptime hệ thống',         value: '≥ 99%',             ok: true },
              { label: 'Thời gian phản hồi API',  value: '< 200ms',           ok: true },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>{s.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{s.value}</span>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                </div>
              </div>
            ))}
          </div>
        </Card>}

        {/* ── ABOUT ── */}
        {section === 'about' && <>
          <Card title="Về hệ thống">
            {[
              { label: 'Tên hệ thống',  value: 'Smart Parking Management System' },
              { label: 'Phiên bản',     value: 'v1.0.0' },
              { label: 'Môi trường',    value: 'Production' },
              { label: 'Trường',        value: 'Đại học Bách Khoa — ĐHQG TP.HCM' },
              { label: 'Địa chỉ',       value: '268 Lý Thường Kiệt, P.14, Q.10, TP.HCM' },
            ].map(r => (
              <Row key={r.label} label={r.label}>
                <span style={{ fontSize: 13, color: '#94a3b8', textAlign: 'right' }}>{r.value}</span>
              </Row>
            ))}
          </Card>

          <Card title="Giờ hoạt động & Biểu phí">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
              {[
                { day: 'Thứ 2 – Thứ 7 (ban ngày)',   range: '06:00 – 18:00', fee: '2.000đ/lượt', color: '#22c55e' },
                { day: 'Thứ 2 – Thứ 7 (ban đêm)',   range: '18:00 – 24:00', fee: '3.000đ/lượt', color: '#f59e0b' },
                { day: 'Thứ 2 – Thứ 7 (sáng sớm)', range: '00:00 – 06:00', fee: '3.000đ/lượt', color: '#f59e0b' },
                { day: 'Chủ Nhật (cả ngày)',         range: '00:00 – 24:00', fee: '3.000đ/lượt', color: '#f59e0b' },
              ].map(h => (
                <div key={h.day} style={{ background: '#222b3a', borderRadius: 8, padding: '12px 14px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{h.day}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{h.range}</div>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: h.color }}>{h.fee}</span>
                </div>
              ))}
            </div>
          </Card>
        </>}

      </div>
    </div>
  );
}
