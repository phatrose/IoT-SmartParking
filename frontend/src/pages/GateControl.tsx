import { useState, useEffect, useCallback } from 'react';
import { visitorApi } from '../services/api';

const FEES: Record<string, number> = { motorbike: 5000, car: 15000, bicycle: 2000 };
const VEHICLE_LABELS: Record<string, string> = { motorbike: 'Xe máy', car: 'Ô tô', bicycle: 'Xe đạp' };
const HOURS_LABEL = [1,2,3,4,6,8,12,24].map(h => ({ value: h, label: `${h} giờ` }));

export default function GateControl() {
  const [plate,  setPlate]  = useState('');
  const [type,   setType]   = useState('motorbike');
  const [name,   setName]   = useState('');
  const [msv,    setMsv]    = useState('');
  const [hours,  setHours]  = useState(1);
  const [tickets, setTickets] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [issuedTicket, setIssuedTicket] = useState<any>(null);

  const load = useCallback(async () => {
    try { const { data } = await visitorApi.list(true); setTickets(data); } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const fee = FEES[type] * hours;

  const issue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plate.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await visitorApi.issue({
        license_plate:  plate.toUpperCase(),
        vehicle_type:   type,
        visitor_name:   name || msv || undefined,
        duration_hours: hours,
      });
      setIssuedTicket({ ...data, plate: plate.toUpperCase(), name, msv, type, hours, fee: data.fee_preview ?? fee });
      setPlate(''); setName(''); setMsv('');
      await load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi cấp vé');
    } finally { setSubmitting(false); }
  };

  const checkout = async (code: string) => {
    if (!confirm(`Checkout vé ${code}?`)) return;
    try {
      const { data } = await visitorApi.checkout(code);
      alert(`Phí: ${Number(data.fee).toLocaleString('vi-VN')}đ – Thời gian: ${data.duration} phút`);
      load();
    } catch (err: any) { alert(err.response?.data?.message || 'Lỗi'); }
  };

  const now = new Date();
  const nowStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const previewPlate = plate.toUpperCase() || '---';
  const previewName  = name  || msv  || '---';

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Temporary Ticket</h1>
      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Cấp vé tạm thời cho xe</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16 }}>
        {/* Left: form */}
        <div style={{ background: '#1c2333', border: '1px solid #2a3650', borderRadius: 12, padding: '20px 22px' }}>
          <form onSubmit={issue}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 18 }}>Thông tin xe</div>

            <Field label="Biển số xe">
              <input value={plate} onChange={e => setPlate(e.target.value)}
                placeholder="VD: 29A-12345" required
                style={inputStyle} />
            </Field>

            <Field label="Loại xe">
              <select value={type} onChange={e => setType(e.target.value)} style={inputStyle}>
                {Object.entries(VEHICLE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </Field>

            <Field label="Thời gian gửi">
              <select value={hours} onChange={e => setHours(Number(e.target.value))} style={inputStyle}>
                {HOURS_LABEL.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>

            <div style={{ height: 1, background: '#2a3650', margin: '18px 0' }} />

            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 18 }}>Thông tin sinh viên</div>

            <Field label="Họ và tên">
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="Nhập họ tên sinh viên"
                style={inputStyle} />
            </Field>

            <Field label="Mã sinh viên">
              <input value={msv} onChange={e => setMsv(e.target.value)}
                placeholder="VD: SV123456"
                style={inputStyle} />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
              <button type="submit" disabled={submitting || !plate}
                style={{
                  padding: '11px', borderRadius: 8,
                  background: submitting ? '#374151' : '#3b82f6',
                  color: '#fff', border: 'none', fontSize: 13, fontWeight: 600,
                  cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                }}>
                {submitting ? 'Đang cấp...' : 'Cấp vé'}
              </button>
              <button type="button"
                onClick={() => { setPlate(''); setName(''); setMsv(''); setIssuedTicket(null); }}
                style={{
                  padding: '11px', borderRadius: 8, background: '#222b3a',
                  color: '#94a3b8', border: '1px solid #2a3650',
                  fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                Hủy
              </button>
            </div>
          </form>
        </div>

        {/* Right: preview */}
        <div style={{ background: '#1c2333', border: '1px solid #2a3650', borderRadius: 12, padding: '20px 22px' }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>Preview vé</div>

          <div style={{ background: '#222b3a', border: '1px solid #2a3650', borderRadius: 12, padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: 1, marginBottom: 4 }}>VÉ GỬI XE TẠM THỜI</div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 16 }}>Bãi xe Đại học</div>

            {/* QR placeholder */}
            <div style={{ width: 70, height: 70, background: '#2a3650', borderRadius: 8, margin: '0 auto 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
              🔲
            </div>

            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <InfoRow icon="🚗" label="Biển số xe" value={previewPlate} />
              <InfoRow icon="👤" label="Sinh viên"  value={previewName} />
              <InfoRow icon="📅" label="Ngày"       value={issuedTicket ? dateStr : '---'} />
              <InfoRow icon="🕐" label="Giờ vào"    value={issuedTicket ? nowStr : '---'} />
            </div>

            <div style={{ height: 1, background: '#2a3650', margin: '14px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
              <span style={{ color: '#94a3b8' }}>Thời gian gửi:</span>
              <span style={{ fontWeight: 600 }}>{hours} giờ</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#94a3b8' }}>Phí dự kiến:</span>
              <span style={{ fontWeight: 700, color: '#3b82f6', fontSize: 15 }}>
                {(issuedTicket?.fee ?? fee).toLocaleString('vi-VN')}đ
              </span>
            </div>

            {issuedTicket && (
              <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(34,197,94,.1)',
                border: '1px solid rgba(34,197,94,.3)', borderRadius: 8, fontSize: 12, color: '#22c55e' }}>
                ✅ Mã vé: <strong>{issuedTicket.ticket_code}</strong>
              </div>
            )}

            <div style={{ marginTop: 12, fontSize: 11, color: '#64748b' }}>
              Vui lòng giữ vé để xuất trình khi ra
            </div>
          </div>

          {/* Active tickets list */}
          {tickets.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Vé đang hoạt động</span>
                <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11,
                  background: 'rgba(59,130,246,.15)', color: '#3b82f6' }}>{tickets.length} vé</span>
              </div>
              <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tickets.map(t => (
                  <div key={t.id} style={{ background: '#222b3a', border: '1px solid #2a3650',
                    borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#3b82f6', fontWeight: 700 }}>
                        {t.ticketCode}
                      </span>
                      <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>
                        {Number(t.feeAmount).toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 2 }}>
                      {t.licensePlate} · {VEHICLE_LABELS[t.vehicleType] || t.vehicleType}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
                      {t.visitorName || 'Khách'} ·{' '}
                      {new Date(t.entryTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      {' → '}
                      {new Date(t.expiryTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <button onClick={() => checkout(t.ticketCode)}
                      style={{ width: '100%', padding: '5px', borderRadius: 6, background: 'transparent',
                        border: '1px solid #2a3650', color: '#94a3b8', fontSize: 11,
                        cursor: 'pointer', fontFamily: 'inherit' }}>
                      Checkout
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 28, height: 28, background: '#2a3650', borderRadius: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, color: '#64748b' }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 600, fontFamily: value === '---' ? 'inherit' : 'monospace' }}>
          {value}
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#222b3a', border: '1px solid #2a3650',
  borderRadius: 8, padding: '10px 12px', color: '#e2e8f0', fontSize: 13,
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
};
