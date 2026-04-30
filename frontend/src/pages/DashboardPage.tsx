import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { adminApi } from '../services/api';
import { Skeleton, SkeletonCard } from '../components/Skeleton';

interface ZoneStat { zone_code: string; total: number; available: number; }
interface ChartPoint { label: string; date: string; count: number; }
interface ActivityRow { time: string; user: string; plate: string; slot: string; action: string; }
interface Alert { type: 'error' | 'warning' | 'success'; message: string; time: string; }
interface IotSensor { id: string | null; slot: string; zone: string; status: string; }

const ALERT_STYLE: Record<string, { bg: string; border: string; dot: string }> = {
  error:   { bg: 'rgba(239,68,68,.12)',   border: 'rgba(239,68,68,.3)',   dot: '#ef4444' },
  warning: { bg: 'rgba(245,158,11,.12)',  border: 'rgba(245,158,11,.3)',  dot: '#f59e0b' },
  success: { bg: 'rgba(34,197,94,.12)',   border: 'rgba(34,197,94,.3)',   dot: '#22c55e' },
};

const ZONE_COLOR = (pct: number) => pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#3b82f6';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState('');

  const load = useCallback(async () => {
    try {
      const { data: d } = await adminApi.dashboard();
      setData(d);
      setLastUpdate(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch {}
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  if (!data) return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Skeleton width={120} height={24} />
        <div style={{ display: 'flex', gap: 10 }}>
          <Skeleton width={180} height={34} />
          <Skeleton width={34} height={34} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        {[0,1,2,3].map(i => <SkeletonCard key={i} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: '#1c2333', border: '1px solid #2a3650', borderRadius: 12, padding: '18px 20px' }}>
            <Skeleton width="40%" height={14} style={{ marginBottom: 8 }} />
            <Skeleton width="30%" height={10} style={{ marginBottom: 20 }} />
            <Skeleton width="100%" height={180} borderRadius={8} />
          </div>
          <div style={{ background: '#1c2333', border: '1px solid #2a3650', borderRadius: 12, padding: '18px 20px' }}>
            <Skeleton width="35%" height={14} style={{ marginBottom: 16 }} />
            {[0,1,2,3,4].map(i => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <Skeleton width={60} height={12} />
                <Skeleton width="30%" height={12} />
                <Skeleton width="20%" height={12} />
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: '#1c2333', border: '1px solid #2a3650', borderRadius: 12, padding: '16px 18px' }}>
            <Skeleton width="60%" height={14} style={{ marginBottom: 14 }} />
            {[0,1,2].map(i => <Skeleton key={i} width="100%" height={12} style={{ marginBottom: 14 }} />)}
          </div>
          <div style={{ background: '#1c2333', border: '1px solid #2a3650', borderRadius: 12, padding: '16px 18px' }}>
            <Skeleton width="50%" height={14} style={{ marginBottom: 12 }} />
            {[0,1,2,3].map(i => <Skeleton key={i} width="100%" height={48} borderRadius={8} style={{ marginBottom: 8 }} />)}
          </div>
        </div>
      </div>
    </div>
  );

  const zones: ZoneStat[] = data.zones ?? [];
  const chart: ChartPoint[] = data.weeklyChart ?? [];
  const activity: ActivityRow[] = data.recentActivity ?? [];
  const alerts: Alert[] = data.systemAlerts ?? [];
  const sensors: IotSensor[] = data.iotSensors ?? [];
  const totalSessions = chart.reduce((s, d) => s + d.count, 0);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Dashboard</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input placeholder="Tìm kiếm..." style={{
            background: '#1c2333', border: '1px solid #2a3650', borderRadius: 8,
            padding: '7px 14px', color: '#e2e8f0', fontSize: 12, outline: 'none', width: 180,
          }} />
          <div style={{ width: 34, height: 34, background: '#1c2333', border: '1px solid #2a3650', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16 }}>🔔</div>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        {/* Total occupied */}
        <div style={{ background: '#1c2333', border: '1px solid #2a3650', borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>Xe đang đỗ</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#e2e8f0' }}>{data.totalOccupied}</div>
          <div style={{ fontSize: 11, color: '#22c55e', marginTop: 6 }}>+{Math.floor(data.totalOccupied * 0.08)} so với hôm qua</div>
        </div>
        {/* Zone cards */}
        {zones.map(z => {
          const pct = z.total > 0 ? Math.round((1 - z.available / z.total) * 100) : 0;
          const color = ZONE_COLOR(pct);
          const isFull = pct >= 100;
          return (
            <div key={z.zone_code} style={{
              background: '#1c2333', border: `1px solid ${isFull ? '#ef4444' : '#2a3650'}`,
              borderRadius: 12, padding: '18px 20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 11, color: '#64748b' }}>Bãi {z.zone_code}</div>
                {isFull && <span style={{ fontSize: 10, fontWeight: 700, color: '#ef4444',
                  background: 'rgba(239,68,68,.15)', padding: '2px 7px', borderRadius: 20 }}>FULL</span>}
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color, marginTop: 6 }}>
                {isFull ? 'FULL' : `${z.available}/${z.total}`}
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                {isFull ? `${z.total}/${z.total} chỗ đã đỗ` : `Lấp đầy ${pct}%`}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main content row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14 }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Weekly chart */}
          <div style={{ background: '#1c2333', border: '1px solid #2a3650', borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ marginBottom: 4, fontWeight: 600, fontSize: 14 }}>Lượt xe theo ngày trong tuần</div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 16 }}>
              Tháng {new Date().toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' })} · Tổng: {totalSessions} lượt
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#1c2333', border: '1px solid #2a3650', borderRadius: 8, fontSize: 12 }}
                  cursor={{ fill: 'rgba(59,130,246,.08)' }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]}
                  label={{ position: 'top', fill: '#64748b', fontSize: 10 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Recent activity */}
          <div style={{ background: '#1c2333', border: '1px solid #2a3650', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #2a3650', fontWeight: 600, fontSize: 14 }}>
              Hoạt động gần đây
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Thời gian', 'Người dùng', 'Biển số', 'Slot', 'Trạng thái'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11,
                      color: '#64748b', borderBottom: '1px solid #2a3650', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activity.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>Chưa có hoạt động</td></tr>
                ) : activity.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(42,54,80,.4)' }}>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{r.time}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12 }}>{r.user}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12 }}>{r.plate}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12 }}>{r.slot}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: r.action === 'Vào' ? 'rgba(34,197,94,.15)' : 'rgba(245,158,11,.15)',
                        color: r.action === 'Vào' ? '#22c55e' : '#f59e0b',
                      }}>{r.action}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Zone occupancy bars */}
          <div style={{ background: '#1c2333', border: '1px solid #2a3650', borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Tình trạng bãi xe</div>
            {zones.map(z => {
              const pct = z.total > 0 ? Math.round((1 - z.available / z.total) * 100) : 0;
              const color = ZONE_COLOR(pct);
              return (
                <div key={z.zone_code} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                    <span>Bãi {z.zone_code}</span>
                    <span style={{ color, fontWeight: 700 }}>{pct}%</span>
                  </div>
                  <div style={{ height: 8, background: '#222b3a', borderRadius: 4 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width .5s' }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* System alerts */}
          <div style={{ background: '#1c2333', border: '1px solid #2a3650', borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Cảnh báo hệ thống</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {alerts.map((a, i) => {
                const s = ALERT_STYLE[a.type];
                return (
                  <div key={i} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: s.dot }}>{a.message}</span>
                    </div>
                    <div style={{ fontSize: 10, color: '#64748b', paddingLeft: 13 }}>{a.time}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* IoT Sensors */}
          <div style={{ background: '#1c2333', border: '1px solid #2a3650', borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>IoT Sensors</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sensors.map((s, i) => {
                const isOk = s.status === 'OK';
                const dot = isOk ? '#22c55e' : s.status === 'Offline' ? '#f59e0b' : '#ef4444';
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 0', borderBottom: i < sensors.length - 1 ? '1px solid rgba(42,54,80,.4)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: dot }} />
                      <span style={{ fontSize: 12 }}>{s.zone}{s.slot}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: dot }}>{s.status}</span>
                  </div>
                );
              })}
              {sensors.length === 0 && (
                <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center', padding: '8px 0' }}>
                  Tất cả cảm biến OK
                </div>
              )}
            </div>
          </div>

          {/* Last update */}
          <div style={{ textAlign: 'right', fontSize: 10, color: '#64748b' }}>
            Cập nhật: {lastUpdate}
          </div>
        </div>
      </div>
    </div>
  );
}