import { useState, useEffect, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { visitorApi, parkingApi } from '../services/api';
import { useToast } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';

interface Reservation {
  userId: number;
  user: { name: string; hcmutId: string; rfidCard: string };
  slot: { slotCode: string; zone: string };
  checkedIn: boolean;
  sessionId: number | null;
}

interface ActiveSession {
  id: number;
  entryTime: string;
  entryGate: string;
  user: { id: number; fullName: string; hcmutId: string; rfidCard: string };
  slot: { slotCode: string; zone: { zoneCode: string } } | null;
}

const FEES: Record<string, number> = { motorbike: 5000, car: 15000, bicycle: 2000 };
const VEHICLE_LABELS: Record<string, string> = { motorbike: 'Xe máy', car: 'Ô tô', bicycle: 'Xe đạp' };
const HOURS_LABEL = [1,2,3,4,6,8,12,24].map(h => ({ value: h, label: `${h} giờ` }));

function useIsMobile(bp = 640) {
  const [m, setM] = useState(() => window.innerWidth < bp);
  useEffect(() => {
    const h = () => setM(window.innerWidth < bp);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, [bp]);
  return m;
}

export default function GateControl() {
  const mobile = useIsMobile();
  const { toast } = useToast();
  const { user } = useAuth();
  const isOperator = user?.role === 'OPERATOR' || user?.role === 'ADMIN';
  const [plate,  setPlate]  = useState('');
  const [type,   setType]   = useState('motorbike');
  const [name,   setName]   = useState('');
  const [msv,    setMsv]    = useState('');
  const [hours,  setHours]  = useState(1);
  const [tickets, setTickets] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [issuedTicket, setIssuedTicket] = useState<any>(null);
  const [showReviewPopup, setShowReviewPopup] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Gate dashboard state
  const [reservations, setReservations]     = useState<Reservation[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [resLastUpdate, setResLastUpdate]   = useState('');
  const [checkingIn, setCheckingIn]         = useState<number | null>(null);
  const [checkingOut, setCheckingOut]       = useState<number | null>(null);
  const resTimerRef = useRef<any>();

  // RFID simulation state
  const [rfid, setRfid]         = useState('');
  const [rfidGate, setRfidGate] = useState('GATE-A');
  const [rfidResult, setRfidResult] = useState<{
    granted: boolean; msg: string; slotCode?: string; wasReserved?: boolean; userName?: string;
  } | null>(null);
  const [rfidBusy, setRfidBusy] = useState(false);

  const loadGateData = useCallback(async () => {
    if (!isOperator) return;
    try {
      const [resRes, sesRes] = await Promise.all([
        parkingApi.getReservations(),
        parkingApi.getActiveSessions(),
      ]);
      setReservations(resRes.data);
      setActiveSessions(sesRes.data);
      setResLastUpdate(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch {}
  }, [isOperator]);

  useEffect(() => {
    loadGateData();
    resTimerRef.current = setInterval(loadGateData, 5000);
    return () => clearInterval(resTimerRef.current);
  }, [loadGateData]);

  const quickCheckin = async (r: Reservation) => {
    setCheckingIn(r.userId);
    try {
      const { data } = await parkingApi.checkIn(r.user.rfidCard, rfidGate);
      if (data.granted) {
        toast(`✅ ${r.user.name} vào bãi — Slot ${data.slot_code ?? r.slot.slotCode}`, 'success');
        loadGateData();
      } else {
        toast(data.reason || 'Từ chối', 'error');
      }
    } catch (err: any) {
      toast(err.response?.data?.message || 'Lỗi kết nối', 'error');
    } finally { setCheckingIn(null); }
  };

  const quickCheckout = async (s: ActiveSession) => {
    setCheckingOut(s.id);
    try {
      const { data } = await parkingApi.checkOut(s.user.rfidCard, rfidGate);
      toast(`✅ ${s.user.fullName} ra bãi — ${data.duration_minutes ?? 0} phút`, 'success');
      loadGateData();
    } catch (err: any) {
      toast(err.response?.data?.message || 'Lỗi kết nối', 'error');
    } finally { setCheckingOut(null); }
  };

  const load = useCallback(async () => {
    try { const { data } = await visitorApi.list(true); setTickets(data); } catch { toast('Không tải được danh sách vé', 'error'); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (showReviewPopup && issuedTicket) {
      const timeout = setTimeout(() => setShowReviewPopup(false), 5000);
      return () => clearTimeout(timeout);
    }
  }, [showReviewPopup, issuedTicket]);

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
      setShowReviewPopup(true);
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

  const rfidScan = async (action: 'checkin' | 'checkout') => {
    if (!rfid.trim()) { toast('Nhập mã thẻ RFID trước', 'error'); return; }
    setRfidBusy(true); setRfidResult(null);
    try {
      const { data } = action === 'checkin'
        ? await parkingApi.checkIn(rfid.trim(), rfidGate)
        : await parkingApi.checkOut(rfid.trim(), rfidGate);
      if (action === 'checkin') {
        setRfidResult({
          granted: data.granted !== false,
          msg: data.granted ? (data.message || 'Vào bãi thành công') : (data.reason || 'Từ chối'),
          slotCode: data.slot_code,
          wasReserved: data.was_reserved,
          userName: data.user?.name,
        });
      } else {
        setRfidResult({ granted: true, msg: data.message || 'Ra bãi thành công' });
      }
      if (data.granted !== false) {
        toast(action === 'checkin' ? 'Mở barrier — Xe vào' : 'Mở barrier — Xe ra', 'success');
        loadGateData();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Lỗi kết nối';
      setRfidResult({ granted: false, msg });
      toast(msg, 'error');
    } finally { setRfidBusy(false); }
  };

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Vé tạm thời</h1>
      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>Cấp vé cho xe khách vãng lai</p>

      {/* ── Gate Dashboard: 2 cột Xe chờ vào / Xe chờ ra ── */}
      {isOperator && (
        <div style={{ background: '#1c2333', border: '1px solid #2a3650', borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>🚧 Bảng điều phối cổng</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: '#64748b' }}>Cổng:</span>
                <select value={rfidGate} onChange={e => setRfidGate(e.target.value)}
                  style={{ background: '#222b3a', border: '1px solid #2a3650', borderRadius: 6,
                    padding: '3px 8px', color: '#e2e8f0', fontSize: 12, fontFamily: 'inherit' }}>
                  {['GATE-A', 'GATE-B', 'GATE-C'].map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <span style={{ fontSize: 11, color: '#64748b' }}>Cập nhật: {resLastUpdate || '—'}</span>
            </div>
          </div>

          {/* 2-column layout */}
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 12 }}>

            {/* ── Cột trái: Xe chờ vào ── */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#22c55e' }}>↓ Xe chờ vào</span>
                <span style={{ padding: '1px 7px', borderRadius: 20, fontSize: 11,
                  background: 'rgba(34,197,94,.15)', color: '#22c55e' }}>
                  {reservations.filter(r => !r.checkedIn).length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {reservations.filter(r => !r.checkedIn).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: '#64748b', fontSize: 12,
                    border: '1px dashed #2a3650', borderRadius: 10 }}>
                    Không có xe đặt trước
                  </div>
                ) : reservations.filter(r => !r.checkedIn).map(r => (
                  <div key={r.userId} style={{
                    background: 'rgba(34,197,94,.06)', border: '1px solid rgba(34,197,94,.2)',
                    borderRadius: 10, padding: '10px 12px',
                    display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{r.user.name}</div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        {r.user.hcmutId} · Slot <span style={{ fontFamily: 'monospace', color: '#3b82f6', fontWeight: 700 }}>{r.slot.slotCode}</span>
                      </div>
                      <div style={{ fontSize: 10, color: '#64748b', marginTop: 1, fontFamily: 'monospace' }}>
                        {r.user.rfidCard}
                      </div>
                    </div>
                    <button onClick={() => quickCheckin(r)} disabled={checkingIn === r.userId}
                      style={{ padding: '7px 14px', borderRadius: 8, border: 'none',
                        background: checkingIn === r.userId ? '#374151' : '#22c55e',
                        color: '#fff', fontSize: 12, fontWeight: 700,
                        cursor: checkingIn === r.userId ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                      {checkingIn === r.userId ? '...' : '↓ Cho vào'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Cột phải: Xe chờ ra ── */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>↑ Xe chờ ra</span>
                <span style={{ padding: '1px 7px', borderRadius: 20, fontSize: 11,
                  background: 'rgba(245,158,11,.15)', color: '#f59e0b' }}>
                  {activeSessions.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
                {activeSessions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: '#64748b', fontSize: 12,
                    border: '1px dashed #2a3650', borderRadius: 10 }}>
                    Không có xe trong bãi
                  </div>
                ) : activeSessions.map(s => {
                  const mins = Math.floor((Date.now() - new Date(s.entryTime).getTime()) / 60000);
                  const h = Math.floor(mins / 60), m = mins % 60;
                  return (
                    <div key={s.id} style={{
                      background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.2)',
                      borderRadius: 10, padding: '10px 12px',
                      display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{s.user.fullName}</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                          {s.user.hcmutId} · Slot <span style={{ fontFamily: 'monospace', color: '#f59e0b', fontWeight: 700 }}>{s.slot?.slotCode ?? '—'}</span>
                        </div>
                        <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>
                          Vào {new Date(s.entryTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} · {h > 0 ? `${h}h ` : ''}{m}p
                        </div>
                      </div>
                      <button onClick={() => quickCheckout(s)} disabled={checkingOut === s.id}
                        style={{ padding: '7px 14px', borderRadius: 8, border: 'none',
                          background: checkingOut === s.id ? '#374151' : '#f59e0b',
                          color: '#fff', fontSize: 12, fontWeight: 700,
                          cursor: checkingOut === s.id ? 'not-allowed' : 'pointer',
                          fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                        {checkingOut === s.id ? '...' : '↑ Cho ra'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── RFID Simulation panel ── */}
      <div style={{ background: '#1c2333', border: '1px solid #2a3650', borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>📡</span> Giả lập quét thẻ RFID
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Mã thẻ RFID</label>
            <input value={rfid} onChange={e => setRfid(e.target.value)}
              placeholder="VD: RFID-SV001 hoặc mã thẻ thật"
              style={{ ...inputStyle, background: '#0f1117' }} />
          </div>
          <div style={{ flex: '0 0 120px' }}>
            <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Cổng</label>
            <select value={rfidGate} onChange={e => setRfidGate(e.target.value)} style={{ ...inputStyle, background: '#0f1117' }}>
              {['GATE-A', 'GATE-B', 'GATE-C'].map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <button type="button" onClick={() => rfidScan('checkin')} disabled={rfidBusy}
            style={{ flex: '0 0 auto', padding: '10px 18px', borderRadius: 8, background: rfidBusy ? '#374151' : '#22c55e',
              border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: rfidBusy ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            ↓ Vào bãi
          </button>
          <button type="button" onClick={() => rfidScan('checkout')} disabled={rfidBusy}
            style={{ flex: '0 0 auto', padding: '10px 18px', borderRadius: 8, background: rfidBusy ? '#374151' : '#f59e0b',
              border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: rfidBusy ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            ↑ Ra bãi
          </button>
        </div>
        {rfidResult && (
          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, fontSize: 13,
            background: rfidResult.granted ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.12)',
            border: `1px solid ${rfidResult.granted ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.3)'}`,
            color: rfidResult.granted ? '#22c55e' : '#ef4444' }}>
            {rfidResult.granted ? '✅' : '❌'} {rfidResult.msg}
            {rfidResult.slotCode && (
              <div style={{ marginTop: 4, fontSize: 12, color: rfidResult.wasReserved ? '#22c55e' : '#94a3b8' }}>
                Slot: <strong style={{ fontFamily: 'monospace' }}>{rfidResult.slotCode}</strong>
                {rfidResult.wasReserved && ' (đặt trước)'}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 380px', gap: 16 }}>
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

      {showReviewPopup && issuedTicket && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
          onClick={(e) => e.target === e.currentTarget && setShowReviewPopup(false)}
        >
          <div 
            style={{
              background: '#1c2333',
              border: '1px solid #2a3650',
              borderRadius: 16,
              padding: 28,
              width: 'min(420px, 90vw)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>✅ Vé đã cấp thành công</h2>
              <button 
                onClick={() => setShowReviewPopup(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 20, cursor: 'pointer', padding: 4 }}
              >✕</button>
            </div>

            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: 1, marginBottom: 8 }}>VÉ GỬI XE TẠM THỜI</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>Bãi xe Đại học HCMUT</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <div style={{ background: '#fff', padding: 12, borderRadius: 10 }}>
                <QRCodeSVG value={qrValue} size={100} level="M" />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'monospace', color: '#3b82f6', marginBottom: 4 }}>
                  {issuedTicket.ticket_code}
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Mã vé</div>
              </div>

              <div>
                <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>Biển số xe</div>
                <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace' }}>{issuedTicket.plate}</div>
              </div>

              <div>
                <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>Người gửi</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{issuedTicket.name || issuedTicket.msv || 'Khách vãng lai'}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Loại xe</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{VEHICLE_LABELS[issuedTicket.type] || issuedTicket.type}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Thời gian</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{issuedTicket.hours} giờ</div>
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#3b82f6', marginBottom: 4 }}>
                  {Number(issuedTicket.fee).toLocaleString('vi-VN')}đ
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>Phí gửi xe</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button onClick={printTicket} style={{ flex: 1, padding: '12px', borderRadius: 10, background: '#22c55e', color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                🖨 In vé
              </button>
              <button onClick={() => setShowReviewPopup(false)} style={{ flex: 1, padding: '12px', borderRadius: 10, background: 'transparent', color: '#94a3b8', border: '1px solid #2a3650', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Đóng
              </button>
            </div>

            <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#64748b', paddingTop: 12, borderTop: '1px solid #2a3650' }}>
              Vui lòng giữ vé để xuất trình khi ra cổng
            </div>
          </div>
        </div>
      )}
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
