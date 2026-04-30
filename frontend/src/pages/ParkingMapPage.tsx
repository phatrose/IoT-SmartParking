import { useState, useEffect, useCallback, useRef } from 'react';
import { iotApi, parkingApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Slot {
  id: number; slotCode: string; status: 'AVAILABLE' | 'OCCUPIED' | 'FAULTY';
  isFaulty: boolean; sensorId: string | null; rowNumber: number; lastIotUpdate: string;
  zone: { zoneCode: string; zoneName: string };
}
interface LedState { zone: string; available: number; total: number; state: string; label: string; }
interface ActiveSession { id: number; slotId: number; entryTime: string; slot?: { slotCode: string; zone?: { zoneCode: string } }; }

// ── Tính phí/lượt tại thời điểm dt (đồng bộ quy tắc billing-calculator.ts) ──
function feeAtTime(dt: Date): number {
  const dow = dt.getDay(); // 0=CN, 1-6=T2-T7
  const h = dt.getHours();
  if (dow === 0) return 3_000;           // Chủ Nhật cả ngày
  if (h >= 6 && h < 18) return 2_000;   // T2-T7 ban ngày 06:00-17:59
  return 3_000;                          // T2-T7 ban đêm 18:00-05:59
}

// ── Tính phí ước tính theo block-based (đồng bộ backend billing-calculator) ──
function calcEstimatedFee(entry: Date, now: Date): number {
  if (now <= entry) return 0;
  let fee = 0;

  // Duyệt từng ngày dương lịch từ ngày entry đến ngày now
  let cursor = new Date(entry);
  cursor.setHours(0, 0, 0, 0);
  const lastDay = new Date(now);
  lastDay.setHours(0, 0, 0, 0);

  while (cursor <= lastDay) {
    const dow = cursor.getDay();
    const base = cursor.getTime();

    const overlap = (sMs: number, eMs: number) =>
      entry.getTime() < eMs && now.getTime() > sMs;

    if (dow === 0) {
      if (overlap(base, base + 24 * 3_600_000)) fee += 3_000;
    } else {
      if (overlap(base,              base + 6  * 3_600_000)) fee += 3_000; // đêm sáng sớm
      if (overlap(base + 6 * 3_600_000, base + 18 * 3_600_000)) fee += 2_000; // ban ngày
      if (overlap(base + 18 * 3_600_000, base + 24 * 3_600_000)) fee += 3_000; // ban đêm
    }
    cursor = new Date(base + 24 * 3_600_000);
  }
  return fee;
}

const SLOT_BG = (s: Slot, selected: boolean, isMySlot: boolean) => {
  if (isMySlot)   return { bg: 'rgba(59,130,246,.25)',   border: '1px solid #3b82f6', color: '#3b82f6' };
  if (selected)   return { bg: 'rgba(34,197,94,.3)',    border: '1px solid #22c55e', color: '#22c55e' };
  if (s.isFaulty) return { bg: 'rgba(245,158,11,.1)',   border: '1px dashed #f59e0b', color: '#f59e0b' };
  if (s.status === 'AVAILABLE') return { bg: 'rgba(59,130,246,.1)', border: '1px solid rgba(59,130,246,.4)', color: '#3b82f6' };
  return { bg: 'rgba(42,54,80,.4)', border: '1px solid #2a3650', color: '#64748b' };
};

type FilterKey = 'available' | 'occupied' | 'mine';

export default function ParkingMapPage() {
  const { user } = useAuth();
  const isOperator = user?.role === 'OPERATOR' || user?.role === 'ADMIN';
  const isStudent  = user?.role === 'STUDENT' || user?.role === 'STAFF';

  const [slots, setSlots]           = useState<Slot[]>([]);
  const [leds, setLeds]             = useState<Record<string, LedState>>({});
  const [zone, setZone]             = useState('A');
  const [selected, setSelected]     = useState<Slot | null>(null);
  const [activeSession, setActive]  = useState<ActiveSession | null>(null);
  const [lastUpdate, setLastUpdate] = useState('');
  const [filters, setFilters]       = useState<Record<FilterKey, boolean>>({ available: true, occupied: true, mine: true });
  const [reservedSlot, setReservedSlot] = useState<Slot | null>(null);
  const [reserving, setReserving]   = useState(false);
  const [faultMsg, setFaultMsg]     = useState('');
  const [now, setNow]               = useState(new Date());
  const pollRef = useRef<any>();

  // Cập nhật "now" mỗi 30s để phí/lượt hiển thị đúng
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const [slotRes, ledA, ledB, ledC] = await Promise.all([
        iotApi.getAllSlots(),
        iotApi.getLed('A'), iotApi.getLed('B'), iotApi.getLed('C'),
      ]);
      setSlots(slotRes.data);
      setLeds({ A: ledA.data, B: ledB.data, C: ledC.data });
      setLastUpdate(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

      if (!isOperator) {
        try {
          const { data } = await parkingApi.myActiveSession();
          setActive(data);
        } catch { setActive(null); }
      }
    } catch {}
  }, [isOperator]);

  useEffect(() => {
    fetchAll();
    pollRef.current = setInterval(fetchAll, 4000);
    return () => clearInterval(pollRef.current);
  }, [fetchAll]);

  const markFault = async (s: Slot) => {
    if (!s.sensorId) return;
    try {
      await iotApi.markFault(s.sensorId);
      setFaultMsg(`Đã đánh dấu lỗi: ${s.slotCode}`);
      setSelected(null);
      fetchAll();
      setTimeout(() => setFaultMsg(''), 3000);
    } catch {
      setFaultMsg('Lỗi khi đánh dấu cảm biến');
      setTimeout(() => setFaultMsg(''), 3000);
    }
  };

  const doReserve = (s: Slot) => {
    setReserving(true);
    setTimeout(() => {
      setReservedSlot(s);
      setSelected(null);
      setReserving(false);
    }, 800);
  };

  const cancelReserve = () => setReservedSlot(null);

  const toggleFilter = (k: FilterKey) =>
    setFilters(prev => ({ ...prev, [k]: !prev[k] }));

  const mySlotCode = activeSession?.slot?.slotCode;
  const myZone     = activeSession?.slot?.zone?.zoneCode;
  const entryTime  = activeSession ? new Date(activeSession.entryTime) : null;
  const estimatedFee = entryTime ? calcEstimatedFee(entryTime, now) : 0;
  const durationMs   = entryTime ? now.getTime() - entryTime.getTime() : 0;
  const durationH    = Math.floor(durationMs / 3_600_000);
  const durationM    = Math.floor((durationMs % 3_600_000) / 60_000);

  const currentFee   = feeAtTime(now);
  const isDaytime    = now.getDay() !== 0 && now.getHours() >= 6 && now.getHours() < 18;

  // Filter + zone
  const zoneSlots = slots
    .filter(s => s.zone?.zoneCode === zone)
    .filter(s => {
      const isMySlot = s.slotCode === mySlotCode && zone === myZone;
      if (isMySlot && !filters.mine) return false;
      if (s.status === 'AVAILABLE' && !s.isFaulty && !isMySlot && !filters.available) return false;
      if ((s.status === 'OCCUPIED' || s.isFaulty) && !isMySlot && !filters.occupied) return false;
      return true;
    });
  const rows = [...new Set(zoneSlots.map(s => s.rowNumber))].sort((a, b) => a - b);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr 220px', gap: 12, height: 'calc(100vh - 80px)' }}>

      {/* ── Left: zone selector + filter ── */}
      <div>
        <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 10 }}>
          Chọn bãi
        </div>
        {['A', 'B', 'C'].map(z => {
          const led = leds[z];
          const pct = led ? Math.round((1 - led.available / led.total) * 100) : 0;
          const color = pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#3b82f6';
          return (
            <div key={z} onClick={() => { setZone(z); setSelected(null); }}
              style={{ background: zone === z ? 'rgba(59,130,246,.12)' : '#1c2333',
                border: `1px solid ${zone === z ? '#3b82f6' : '#2a3650'}`,
                borderRadius: 10, padding: '10px 14px', cursor: 'pointer', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Bãi {z}</span>
                {led && <span style={{ fontSize: 11, fontWeight: 700, color }}>{led.available}/{led.total}</span>}
              </div>
              {led && (
                <div style={{ height: 4, background: '#222b3a', borderRadius: 4, marginTop: 8 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width .5s' }} />
                </div>
              )}
            </div>
          );
        })}

        {leds[zone] && (
          <div style={{ background: '#1c2333', border: '1px solid #2a3650', borderRadius: 10, padding: '12px 14px', marginTop: 6 }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>Tổng khuôn viên</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#22c55e' }}>{leds[zone].available}</div>
                <div style={{ fontSize: 10, color: '#64748b' }}>Trống</div>
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#ef4444' }}>{leds[zone].total - leds[zone].available}</div>
                <div style={{ fontSize: 10, color: '#64748b' }}>Đã đỗ</div>
              </div>
            </div>
            <div style={{ height: 4, background: '#222b3a', borderRadius: 4, marginTop: 10 }}>
              <div style={{ height: '100%', borderRadius: 4, transition: 'width .5s',
                width: `${leds[zone].total > 0 ? Math.round((1 - leds[zone].available / leds[zone].total) * 100) : 0}%`,
                background: zoneColor(leds[zone].total > 0 ? Math.round((1 - leds[zone].available / leds[zone].total) * 100) : 0),
              }} />
            </div>
          </div>
        )}

        {/* Filter checkboxes */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 10, color: '#64748b', marginBottom: 8 }}>Lọc</div>
          {([
            { key: 'available' as FilterKey, color: '#3b82f6', label: 'Trống' },
            { key: 'occupied'  as FilterKey, color: '#64748b', label: 'Đã đỗ' },
            { key: 'mine'      as FilterKey, color: '#3b82f6', label: 'Vị trí của bạn', bold: true },
          ] as { key: FilterKey; color: string; label: string; bold?: boolean }[]).map(({ key, color, label, bold }) => (
            <div key={key} onClick={() => toggleFilter(key)}
              style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11,
                color: filters[key] ? '#94a3b8' : '#374151', marginBottom: 6, cursor: 'pointer', userSelect: 'none' }}>
              <div style={{ width: 10, height: 10, borderRadius: 3,
                background: filters[key] ? `${color}20` : 'transparent',
                border: `1px solid ${filters[key] ? color : '#374151'}` }} />
              <span style={{ fontWeight: bold ? 600 : 400 }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Phí hiện tại */}
        <div style={{ marginTop: 14, background: '#1c2333', border: '1px solid #2a3650', borderRadius: 10, padding: '10px 14px' }}>
          <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6 }}>Phí/lượt hiện tại</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: isDaytime ? '#22c55e' : '#f59e0b' }}>
            {currentFee.toLocaleString('vi-VN')}đ
          </div>
          <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
            {isDaytime ? '☀ Ban ngày 06:00–17:59' : '🌙 Ban đêm 18:00–05:59'}
          </div>
        </div>
      </div>

      {/* ── Center: slot grid ── */}
      <div style={{ background: '#1c2333', border: '1px solid #2a3650', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #2a3650',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Bãi {zone} · Tầng 1</span>
          <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#64748b' }}>
            {[['#3b82f6', 'Trống'], ['#64748b', 'Đã đỗ'], ['#f59e0b', 'Bạn'], ['#22c55e', 'Chọn']].map(([c, l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: `${c}20`, border: `1px solid ${c}` }} />
                <span>{l}</span>
              </div>
            ))}
          </div>
          <span style={{ fontSize: 11, color: '#64748b' }}>Cập nhật: {lastUpdate}</span>
        </div>

        {faultMsg && (
          <div style={{ margin: '8px 16px', padding: '8px 12px', background: 'rgba(245,158,11,.15)',
            border: '1px solid rgba(245,158,11,.3)', borderRadius: 8, fontSize: 12, color: '#f59e0b' }}>
            {faultMsg}
          </div>
        )}

        {reservedSlot && (
          <div style={{ margin: '8px 16px', padding: '10px 14px', background: 'rgba(34,197,94,.12)',
            border: '1px solid rgba(34,197,94,.3)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, color: '#22c55e' }}>
              ✓ Đã đặt trước <strong>{reservedSlot.slotCode}</strong> — đến quét thẻ RFID tại cổng để vào
            </div>
            <button onClick={cancelReserve} style={{ background: 'transparent', border: 'none',
              color: '#64748b', cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {rows.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', fontSize: 13 }}>
              Không có slot nào phù hợp bộ lọc
            </div>
          )}
          {rows.map((r, ri) => (
            <div key={r} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>Dãy {r}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {zoneSlots.filter(s => s.rowNumber === r).map(s => {
                  const isMySlot = s.slotCode === mySlotCode && zone === myZone;
                  const isRes    = reservedSlot?.id === s.id;
                  const isSel    = selected?.id === s.id;
                  const canClick = (s.status === 'AVAILABLE' && !s.isFaulty) || isOperator;
                  const { bg, border, color } = SLOT_BG(s, isSel || isRes, isMySlot);
                  return (
                    <div key={s.id}
                      onClick={() => canClick ? setSelected(prev => prev?.id === s.id ? null : s) : undefined}
                      title={s.sensorId || s.slotCode}
                      style={{
                        width: 52, height: 34, borderRadius: 7,
                        background: isRes ? 'rgba(34,197,94,.2)' : bg,
                        border: isRes ? '1px solid #22c55e' : border,
                        color: isRes ? '#22c55e' : color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'monospace', fontSize: 10, fontWeight: 700,
                        cursor: canClick ? 'pointer' : 'default',
                        transition: 'all .2s',
                        boxShadow: isSel ? `0 0 0 2px ${color}50` : isMySlot ? '0 0 0 2px rgba(59,130,246,.4)' : undefined,
                      }}>
                      {s.slotCode}
                    </div>
                  );
                })}
              </div>
              {ri < rows.length - 1 && (
                <div style={{ marginTop: 10, fontSize: 10, color: '#374151', textAlign: 'center' }}>← lối đi →</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Vị trí của bạn */}
        {!isOperator && (
          <div style={{ background: '#1c2333', border: '1px solid #2a3650', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>Vị trí của bạn</div>
            {activeSession ? (
              <>
                <div style={{ background: 'rgba(59,130,246,.15)', border: '1px solid rgba(59,130,246,.3)',
                  borderRadius: 10, padding: '14px', textAlign: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#3b82f6' }}>{mySlotCode || '—'}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Bãi {myZone}</div>
                </div>
                <Row label="Vào lúc"    value={entryTime?.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} />
                <Row label="Thời gian"  value={`${durationH}h ${durationM}p`} />
                <Row label="Phí tạm tính" value={`${estimatedFee.toLocaleString('vi-VN')}đ`} bold color="#3b82f6" />
                <button style={{ width: '100%', padding: '8px', background: '#1c2333', border: '1px solid #2a3650',
                  borderRadius: 8, color: '#e2e8f0', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', marginTop: 8 }}>
                  Chỉ đường tới xe
                </button>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0', color: '#64748b', fontSize: 12 }}>
                Bạn chưa gửi xe
              </div>
            )}
          </div>
        )}

        {/* Slot đang chọn */}
        {selected ? (
          <div style={{ background: '#1c2333', border: '1px solid #2a3650', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>Slot đang chọn</div>
            <div style={{ background: selected.status === 'AVAILABLE' ? 'rgba(34,197,94,.15)' : 'rgba(42,54,80,.3)',
              border: `1px solid ${selected.status === 'AVAILABLE' ? 'rgba(34,197,94,.3)' : '#2a3650'}`,
              borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: selected.status === 'AVAILABLE' ? '#22c55e' : '#64748b' }}>
                {selected.slotCode}
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                Bãi {selected.zone?.zoneCode} · Dãy {selected.rowNumber} · {selected.status === 'AVAILABLE' ? 'Còn trống' : 'Đã có xe'}
              </div>
            </div>
            <Row label="Loại" value="Xe máy / Xe đạp điện" />
            <Row label="Phí/lượt" value={`${currentFee.toLocaleString('vi-VN')}đ`}
              bold color={isDaytime ? '#22c55e' : '#f59e0b'} />
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 14, textAlign: 'right' }}>
              {isDaytime ? '☀ Khung ngày 06:00–17:59' : '🌙 Khung đêm 18:00–05:59'}
            </div>

            {isStudent && selected.status === 'AVAILABLE' && (
              <button onClick={() => doReserve(selected)}
                disabled={reserving || !!reservedSlot}
                style={{ width: '100%', padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  cursor: (reserving || !!reservedSlot) ? 'not-allowed' : 'pointer', fontFamily: 'inherit', border: 'none',
                  background: reservedSlot ? '#374151' : reserving ? '#374151' : '#3b82f6', color: '#fff' }}>
                {reserving ? 'Đang xử lý...' : reservedSlot ? 'Đã đặt slot khác' : 'Đặt trước slot này'}
              </button>
            )}

            {isOperator && (
              <button onClick={() => markFault(selected)}
                disabled={!selected.sensorId}
                style={{ width: '100%', padding: '10px', background: 'rgba(245,158,11,.15)',
                  border: '1px solid rgba(245,158,11,.3)', borderRadius: 8, color: '#f59e0b',
                  fontSize: 12, cursor: selected.sensorId ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                ⚠ Đánh dấu cảm biến lỗi
              </button>
            )}
          </div>
        ) : (
          <div style={{ background: '#1c2333', border: '1px solid #2a3650', borderRadius: 12, padding: '14px 16px',
            textAlign: 'center', color: '#64748b', fontSize: 12 }}>
            Nhấn vào slot trống để xem thông tin
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, bold, color }: { label: string; value?: string; bold?: boolean; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
      <span style={{ color: '#64748b' }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 600, color: color || '#e2e8f0' }}>{value}</span>
    </div>
  );
}

function zoneColor(pct: number) {
  return pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#3b82f6';
}
