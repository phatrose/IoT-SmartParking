import { useState, useEffect, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { visitorApi } from '../services/api';
import { useToast } from '../components/Toast';

const FEES: Record<string, number> = { motorbike: 5000, car: 15000, bicycle: 2000 };
const VEHICLE_LABELS: Record<string, string> = { motorbike: 'Xe máy', car: 'Ô tô', bicycle: 'Xe đạp' };
const HOURS_LABEL = [1,2,3,4,6,8,12,24].map(h => ({ value: h, label: `${h} giờ` }));

export default function GateControl() {
  const { toast } = useToast();
  const [plate,  setPlate]  = useState('');
  const [type,   setType]   = useState('motorbike');
  const [name,   setName]   = useState('');
  const [msv,    setMsv]    = useState('');
  const [hours,  setHours]  = useState(1);
  const [tickets, setTickets] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [issuedTicket, setIssuedTicket] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

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
      toast('Cấp vé thành công!', 'success');
      await load();
    } catch (err: any) {
      toast(err.response?.data?.message || 'Lỗi cấp vé', 'error');
    } finally { setSubmitting(false); }
  };

  const checkout = async (code: string) => {
    try {
      const { data } = await visitorApi.checkout(code);
      toast(`Checkout OK — Phí: ${Number(data.fee).toLocaleString('vi-VN')}đ`, 'success');
      load();
    } catch (err: any) { toast(err.response?.data?.message || 'Lỗi checkout', 'error'); }
  };

  const printTicket = () => {
    if (!issuedTicket) return;
    const w = window.open('', '_blank', 'width=400,height=600');
    if (!w) return;
    w.document.write(`
      <html><head><title>Vé gửi xe</title>
      <style>
        body{font-family:monospace;padding:20px;text-align:center;background:#fff;color:#000}
        h2{margin:0 0 4px}p{margin:4px 0;font-size:13px}
        .divider{border-top:1px dashed #999;margin:10px 0}
        .fee{font-size:20px;font-weight:bold}
        svg{margin:10px auto;display:block}
      </style></head><body>
      <h2>VÉ GỬI XE TẠM THỜI</h2>
      <p>Bãi xe Đại học HCMUT</p>
      <div class="divider"></div>
      <p><b>Biển số:</b> ${issuedTicket.plate}</p>
      <p><b>Loại xe:</b> ${VEHICLE_LABELS[issuedTicket.type]}</p>
      <p><b>Sinh viên:</b> ${issuedTicket.name || issuedTicket.msv || 'Khách'}</p>
      <p><b>Thời gian:</b> ${issuedTicket.hours} giờ</p>
      <p><b>Mã vé:</b> ${issuedTicket.ticket_code}</p>
      <div class="divider"></div>
      <div id="qr"></div>
      <div class="divider"></div>
      <p class="fee">${Number(issuedTicket.fee).toLocaleString('vi-VN')}đ</p>
      <p style="font-size:11px;color:#666">Vui lòng giữ vé khi ra</p>
      <script>
        const qr = document.getElementById('qr');
        // Simple QR representation
        qr.innerHTML = '<p><b>${issuedTicket.ticket_code}</b></p>';
        window.onload = () => { window.print(); window.close(); }
      </script>
      </body></html>
    `);
    w.document.close();
  };

  const now = new Date();
  const nowStr  = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const previewPlate = plate.toUpperCase() || '---';
  const previewName  = name || msv || '---';
  const qrValue = issuedTicket
    ? `SPMS:${issuedTicket.ticket_code}|${issuedTicket.plate}|${issuedTicket.hours}h`
    : '';

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Vé tạm thời</h1>
      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Cấp vé cho xe khách vãng lai</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16 }}>
        {/* Left: form */}
        <div style={{ background: '#1c2333', border: '1px solid #2a3650', borderRadius: 12, padding: '20px 22px' }}>
          <form onSubmit={issue}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 18 }}>Thông tin xe</div>

            <Field label="Biển số xe">
              <input value={plate} onChange={e => setPlate(e.target.value.toUpperCase())}
                placeholder="VD: 29A-12345" required style={inputStyle} />
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

            <div style={{ background: 'rgba(59,130,246,.08)', border: '1px solid rgba(59,130,246,.2)',
              borderRadius: 8, padding: '10px 14px', marginBottom: 18, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>Phí dự kiến</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#3b82f6' }}>
                {fee.toLocaleString('vi-VN')}đ
              </span>
            </div>

            <div style={{ height: 1, background: '#2a3650', margin: '18px 0' }} />
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 18 }}>Thông tin người gửi</div>

            <Field label="Họ và tên">
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="Nhập họ tên" style={inputStyle} />
            </Field>

            <Field label="Mã sinh viên / CCCD">
              <input value={msv} onChange={e => setMsv(e.target.value)}
                placeholder="VD: 2211001" style={inputStyle} />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
              <button type="submit" disabled={submitting || !plate}
                style={{ padding: '11px', borderRadius: 8,
                  background: submitting ? '#374151' : '#3b82f6',
                  color: '#fff', border: 'none', fontSize: 13, fontWeight: 600,
                  cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {submitting ? 'Đang cấp...' : 'Cấp vé'}
              </button>
              <button type="button"
                onClick={() => { setPlate(''); setName(''); setMsv(''); setIssuedTicket(null); }}
                style={{ padding: '11px', borderRadius: 8, background: '#222b3a',
                  color: '#94a3b8', border: '1px solid #2a3650',
                  fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                Xóa form
              </button>
            </div>
          </form>
        </div>

        {/* Right: preview */}
        <div style={{ background: '#1c2333', border: '1px solid #2a3650', borderRadius: 12, padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>Preview vé</span>
            {issuedTicket && (
              <button onClick={printTicket}
                style={{ padding: '5px 12px', borderRadius: 7, background: 'rgba(34,197,94,.15)',
                  border: '1px solid rgba(34,197,94,.3)', color: '#22c55e',
                  fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                🖨 In vé
              </button>
            )}
          </div>

          <div ref={printRef} style={{ background: '#222b3a', border: '1px solid #2a3650', borderRadius: 12, padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: 1, marginBottom: 4 }}>VÉ GỬI XE TẠM THỜI</div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 16 }}>Bãi xe Đại học HCMUT</div>

            {/* QR code thật hoặc placeholder */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              {issuedTicket ? (
                <div style={{ background: '#fff', padding: 8, borderRadius: 8 }}>
                  <QRCodeSVG value={qrValue} size={90} level="M" />
                </div>
              ) : (
                <div style={{ width: 90, height: 90, background: '#2a3650', borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, color: '#64748b', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 24 }}>⬜</span>
                  <span>QR sẽ hiện sau khi cấp</span>
                </div>
              )}
            </div>

            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <InfoRow icon="🚗" label="Biển số xe" value={previewPlate} />
              <InfoRow icon="👤" label="Người gửi"  value={previewName} />
              <InfoRow icon="📅" label="Ngày"        value={issuedTicket ? dateStr : '---'} />
              <InfoRow icon="🕐" label="Giờ vào"     value={issuedTicket ? nowStr  : '---'} />
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
                ✅ Mã vé: <strong style={{ fontFamily: 'monospace' }}>{issuedTicket.ticket_code}</strong>
              </div>
            )}

            <div style={{ marginTop: 12, fontSize: 11, color: '#64748b' }}>
              Vui lòng giữ vé để xuất trình khi ra
            </div>
          </div>

          {/* Active tickets */}
          {tickets.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Vé đang hoạt động</span>
                <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11,
                  background: 'rgba(59,130,246,.15)', color: '#3b82f6' }}>{tickets.length} vé</span>
              </div>
              <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
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
        <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'monospace' }}>{value}</div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#222b3a', border: '1px solid #2a3650',
  borderRadius: 8, padding: '10px 12px', color: '#e2e8f0', fontSize: 13,
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
};
