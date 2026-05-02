import { useState, useEffect, useCallback, useRef } from 'react';
import { iotApi } from '../services/api';
import { Skeleton } from '../components/Skeleton';

interface Slot {
  id: number;
  slotCode: string;
  zone: { zoneCode: string; zoneName: string };
  status: 'AVAILABLE' | 'OCCUPIED' | 'FAULTY';
  isFaulty: boolean;
  sensorId: string;
  rowNumber: number;
  lastIotUpdate: string;
}

interface LedState {
  zone: string; available: number; total: number;
  state: 'OK' | 'NEARLY_FULL' | 'FULL' | 'UNKNOWN';
  label: string;
}

const LED_COLOR = { OK: '#00ff88', NEARLY_FULL: '#ffaa00', FULL: '#ff3333', UNKNOWN: '#555' };

function useIsMobile(bp = 640) {
  const [m, setM] = useState(() => window.innerWidth < bp);
  useEffect(() => {
    const h = () => setM(window.innerWidth < bp);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, [bp]);
  return m;
}

export default function IoTDashboard() {
  const mobile = useIsMobile();
  const [slots, setSlots]       = useState<Slot[]>([]);
  const [leds, setLeds]         = useState<Record<string, LedState>>({});
  const [zone, setZone]         = useState('A');
  const [selected, setSelected] = useState<Slot | null>(null);
  const [last, setLast]         = useState('');
  const [apiErr, setApiErr]     = useState('');
  const pollRef = useRef<any>();

  const fetchAll = useCallback(async () => {
    try {
      const [slotRes, ...ledRes] = await Promise.all([
        iotApi.getAllSlots(),
        iotApi.getLed('A'), iotApi.getLed('B'), iotApi.getLed('C'),
      ]);
      setSlots(slotRes.data);
      setLeds({ A: ledRes[0].data, B: ledRes[1].data, C: ledRes[2].data });
      setLast(new Date().toLocaleTimeString('vi-VN'));
      setApiErr('');
    } catch { setApiErr('Không thể tải dữ liệu IoT'); }
  }, []);

  useEffect(() => {
    fetchAll();
    pollRef.current = setInterval(fetchAll, 4000);
    return () => clearInterval(pollRef.current);
  }, [fetchAll]);

  const zoneSlots = slots.filter(s => s.zone?.zoneCode === zone);
  const rows = [...new Set(zoneSlots.map(s => s.rowNumber))].sort((a,b)=>a-b);
  const faulty = slots.filter(s => s.isFaulty).length;
  const led = leds[zone] || { zone, available: 0, total: 0, state: 'UNKNOWN' as const, label: '...' };

  const markFault = async (s: Slot) => {
    await iotApi.markFault(s.sensorId);
    setSelected(null);
    fetchAll();
  };

  if (slots.length === 0 && !apiErr) return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '160px 1fr 200px', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[0,1,2].map(i => <Skeleton key={i} width="100%" height={60} borderRadius={8} />)}
        </div>
        <div style={{ background: '#1c2333', border: '1px solid #2a3650', borderRadius: 10, padding: 14 }}>
          <Skeleton width="30%" height={14} style={{ marginBottom: 16 }} />
          {[0,1,2,3].map(i => (
            <div key={i} style={{ marginBottom: 10 }}>
              <Skeleton width="20%" height={10} style={{ marginBottom: 6 }} />
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {[0,1,2,3,4,5,6,7].map(j => <Skeleton key={j} width={54} height={32} borderRadius={6} />)}
              </div>
            </div>
          ))}
        </div>
        <div style={{ background: '#1c2333', border: '1px solid #2a3650', borderRadius: 10, padding: 14 }}>
          <Skeleton width="100%" height={120} borderRadius={10} />
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {apiErr && <div style={{ marginBottom: 12, padding: '10px 14px', background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 8, fontSize: 12, color: '#ef4444' }}>⚠ {apiErr}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center', fontSize: 12, color: '#22c55e', fontWeight: 600 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e' }} />Live
          </span>
          <span style={{ fontSize: 11, color: '#64748b' }}>Cập nhật: {last}</span>
          {faulty > 0 && (
            <span style={{
              padding: '3px 9px', borderRadius: 20, fontSize: 11, color: '#f59e0b',
              background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.3)',
            }}>⚠ {faulty} cảm biến lỗi</span>
          )}
        </div>
        {selected && (
          <button onClick={() => markFault(selected)} style={{
            padding: '7px 14px', borderRadius: 7, background: 'rgba(245,158,11,.15)',
            border: '1px solid rgba(245,158,11,.3)', color: '#f59e0b',
            cursor: 'pointer', fontSize: 12, fontFamily: 'inherit',
          }}>⚠ Đánh dấu lỗi: {selected.slotCode}</button>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: mobile ? '1fr' : '160px 1fr 200px',
        gap: 12,
        minHeight: mobile ? undefined : 'calc(100vh - 120px)',
      }}>
        {/* Zone selector */}
        <div style={{ display: mobile ? 'flex' : 'block', gap: mobile ? 8 : undefined, flexWrap: 'wrap', alignItems: mobile ? 'flex-start' : undefined }}>
          <div style={{ fontSize: 10, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: .8, width: mobile ? '100%' : undefined }}>
            Chọn bãi
          </div>
          {['A', 'B', 'C'].map(z => {
            const ledZ = leds[z];
            if (!ledZ) return null;
            const pct = ledZ.total > 0 ? Math.round((1 - ledZ.available / ledZ.total) * 100) : 0;
            const color = pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#3b82f6';
            return (
              <div key={z} onClick={() => { setZone(z); setSelected(null); }}
                style={{
                  background: zone === z ? 'rgba(59,130,246,.12)' : '#1c2333',
                  border: `1px solid ${zone === z ? '#3b82f6' : '#2a3650'}`,
                  borderRadius: 8, padding: '10px 12px', cursor: 'pointer',
                  marginBottom: mobile ? 0 : 8,
                  flex: mobile ? '1 1 80px' : undefined,
                }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Bãi {z}</div>
                <div style={{ fontSize: 11, color, marginTop: 2 }}>{ledZ.available}/{ledZ.total}</div>
                <div style={{ height: 4, background: '#222b3a', borderRadius: 4, marginTop: 6 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width .5s' }} />
                </div>
              </div>
            );
          })}

          {/* Legend */}
          {!mobile && (
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[['#22c55e', 'Trống'], ['#ef4444', 'Có xe'], ['#f59e0b', 'Lỗi']].map(([c, l]) => (
                <div key={l} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, color: '#64748b' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: `${c}20`, border: `1px solid ${c}` }} />
                  {l}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Slot grid */}
        <div style={{ background: '#1c2333', border: '1px solid #2a3650', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '11px 14px', borderBottom: '1px solid #2a3650', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Bãi {zone}</span>
            <span style={{ fontSize: 11, color: '#64748b' }}>
              {zoneSlots.filter(s => s.status === 'AVAILABLE' && !s.isFaulty).length} trống / {zoneSlots.length}
            </span>
          </div>
          <div style={{ padding: 14, overflowY: 'auto', maxHeight: mobile ? 360 : 'calc(100vh - 200px)' }}>
            {rows.map((r, ri) => (
              <div key={r}>
                <div style={{ fontSize: 10, color: '#64748b', marginBottom: 5, marginTop: ri > 0 ? 10 : 0 }}>
                  Dãy {r}
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {zoneSlots.filter(s => s.rowNumber === r).map(s => {
                    const isSel = selected?.id === s.id;
                    const bg = isSel ? 'rgba(34,197,94,.3)' :
                               s.isFaulty ? '#1a1400' :
                               s.status === 'AVAILABLE' ? 'rgba(34,197,94,.1)' : 'rgba(239,68,68,.08)';
                    const border = isSel ? '1px solid #22c55e' :
                                   s.isFaulty ? '1px dashed #f59e0b' :
                                   s.status === 'AVAILABLE' ? '1px solid rgba(34,197,94,.3)' : '1px solid rgba(239,68,68,.2)';
                    const color = isSel ? '#22c55e' :
                                  s.isFaulty ? '#f59e0b' :
                                  s.status === 'AVAILABLE' ? '#22c55e' : '#ef4444';
                    return (
                      <div key={s.id}
                        onClick={() => setSelected(prev => prev?.id === s.id ? null : s)}
                        style={{
                          width: 54, height: 32, borderRadius: 6, background: bg, border, color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'monospace', fontSize: 10, fontWeight: 600,
                          cursor: 'pointer', transition: 'all .35s',
                          boxShadow: isSel ? '0 0 0 2px rgba(34,197,94,.3)' : undefined,
                        }}>
                        {s.slotCode}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* LED + detail */}
        <div style={{ display: 'flex', flexDirection: mobile ? 'row' : 'column', gap: 10, flexWrap: 'wrap' }}>
          <div style={{
            background: '#0d1117', border: '3px solid #1e2d45', borderRadius: 14,
            padding: mobile ? '14px 20px' : '20px 16px', textAlign: 'center',
            flex: mobile ? '0 0 auto' : undefined,
          }}>
            <div style={{ fontSize: 10, color: '#555', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>
              BÃI {led.zone}
            </div>
            <div style={{
              fontSize: mobile ? 40 : 56, fontWeight: 800, lineHeight: 1, fontFamily: 'monospace',
              color: LED_COLOR[led.state], textShadow: `0 0 18px ${LED_COLOR[led.state]}`,
            }}>{led.available}</div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, marginTop: 6, color: LED_COLOR[led.state] }}>
              {led.label}
            </div>
            <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>
              {led.available}/{led.total}
            </div>
          </div>

          {selected && (
            <div style={{ background: '#1c2333', border: '1px solid #2a3650', borderRadius: 10, padding: 14, flex: mobile ? '1 1 160px' : undefined }}>
              <div style={{ fontSize: 10, color: '#64748b', marginBottom: 8, textTransform: 'uppercase' }}>
                Slot đang chọn
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'monospace', marginBottom: 6,
                color: selected.isFaulty ? '#f59e0b' : selected.status === 'AVAILABLE' ? '#22c55e' : '#ef4444' }}>
                {selected.slotCode}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 3 }}>Sensor: {selected.sensorId}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 10 }}>
                {selected.isFaulty ? '⚠ FAULTY' : selected.status}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
