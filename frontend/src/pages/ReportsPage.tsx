import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { adminApi } from '../services/api';

const PERIODS = ['Tháng', 'Tuần', 'Quý', 'Năm'] as const;
type PeriodTab = typeof PERIODS[number];
const ZONE_COLOR: Record<string, string> = { A: '#3b82f6', B: '#f59e0b', C: '#ef4444' };

function fmtMoney(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M đ`;
  return `${n.toLocaleString('vi-VN')}đ`;
}

function getPeriodParam(tab: PeriodTab): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  if (tab === 'Tháng') return `${now.getFullYear()}-${mm}`;
  if (tab === 'Tuần')  { const d = new Date(now); d.setDate(d.getDate() - d.getDay()); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
  if (tab === 'Quý')   return `${now.getFullYear()}-${String(Math.floor(now.getMonth()/3)*3+1).padStart(2,'0')}`;
  return `${now.getFullYear()}-01`;
}

function exportPDF(data: any, period: string) {
  const lines = [
    `BÁO CÁO THỐNG KÊ - ${period}`,
    `Tổng lượt gửi xe: ${data.sessions?.count ?? 0}`,
    `Doanh thu: ${fmtMoney(data.revenue?.amount ?? 0)}`,
    `Giờ đỗ trung bình: ${((data.avgDuration ?? 0) / 60).toFixed(1)}h`,
    `Vé tạm thời: ${data.visitorCount ?? 0}`,
    '',
    'Top người dùng:',
    ...(data.topUsers ?? []).map((u: any, i: number) =>
      `${i + 1}. ${u.fullName} (${u.hcmutId}) - ${u.sessions} lượt - ${fmtMoney(u.amount)}`
    ),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `BaoCao_${period}.txt`; a.click();
}

export default function ReportsPage() {
  const [tab, setTab]     = useState<PeriodTab>('Tháng');
  const [data, setData]   = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const period = getPeriodParam(tab);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data: d } = await adminApi.getReport(period); setData(d); }
    catch {} finally { setLoading(false); }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const chart: any[]    = data?.dailyChart  ?? [];
  const topUsers: any[] = data?.topUsers    ?? [];
  const zones: any[]    = data?.zones       ?? [];
  const sessions  = data?.sessions?.count   ?? 0;
  const revenue   = data?.revenue?.amount   ?? 0;
  const avgDur    = data?.avgDuration       ?? 0;
  const visitors  = data?.visitorCount      ?? 0;
  const chartTotal = chart.reduce((s, d) => s + d.count, 0);
  const displayPeriod = tab === 'Tháng'
    ? `Tháng ${period.split('-')[1]}/${period.split('-')[0]}` : period;

  // Show at most 14 bars
  const chartData = chart.filter((_, i) => i % Math.max(1, Math.floor(chart.length / 14)) === 0);

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Báo cáo Thống kê</h1>
        <div style={{ display:'flex', gap: 10, alignItems:'center' }}>
          <div style={{ background:'#1c2333', border:'1px solid #2a3650', borderRadius: 8,
            padding:'7px 14px', fontSize: 12, color:'#94a3b8' }}>{displayPeriod}</div>
          <button onClick={() => data && exportPDF(data, period)} style={{
            padding:'8px 18px', background:'#3b82f6', border:'none', borderRadius: 8,
            color:'#fff', fontSize: 12, fontWeight: 600, cursor:'pointer', fontFamily:'inherit',
          }}>Xuất PDF</button>
        </div>
      </div>

      {/* Period tabs */}
      <div style={{ display:'flex', gap: 4, marginBottom: 20, background:'#1c2333',
        border:'1px solid #2a3650', borderRadius: 10, padding: 4, width:'fit-content' }}>
        {PERIODS.map(p => (
          <button key={p} onClick={() => setTab(p)} style={{
            padding:'7px 22px', borderRadius: 7, fontSize: 13, fontFamily:'inherit',
            background: tab === p ? '#3b82f6' : 'transparent',
            color: tab === p ? '#fff' : '#64748b', border:'none',
            cursor:'pointer', fontWeight: tab === p ? 600 : 400, transition:'.15s',
          }}>{p}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding: 60, color:'#64748b' }}>Đang tải...</div>
      ) : (
        <>
          {/* Stat cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
            {[
              { label:'Tổng lượt gửi xe', value: sessions.toString(),      color:'#3b82f6' },
              { label:'Doanh thu tháng',  value: fmtMoney(revenue),         color:'#22c55e' },
              { label:'Giờ đỗ trung bình',value: `${(avgDur/60).toFixed(1)}h`, color:'#f59e0b' },
              { label:'Vé tạm thời',      value: visitors.toString(),       color:'#ef4444' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background:'#1c2333',
                border:`1px solid ${color}40`, borderRadius: 12, padding:'18px 20px' }}>
                <div style={{ fontSize: 11, color:'#64748b', marginBottom: 8 }}>{label}</div>
                <div style={{ fontSize: 30, fontWeight: 800, color }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Chart + zone usage */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 260px', gap: 14, marginBottom: 14 }}>
            {/* Bar chart */}
            <div style={{ background:'#1c2333', border:'1px solid #2a3650', borderRadius: 12, padding:'18px 20px' }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Lượt xe theo ngày</div>
              <div style={{ fontSize: 11, color:'#64748b', marginBottom: 16 }}>
                {displayPeriod} · Tổng: {chartTotal} lượt
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, left:-24, bottom: 0 }}>
                  <XAxis dataKey="day" tick={{ fill:'#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill:'#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background:'#1c2333', border:'1px solid #2a3650', borderRadius: 8, fontSize: 12 }}
                    cursor={{ fill:'rgba(59,130,246,.08)' }} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[3,3,0,0]}
                    label={{ position:'top', fill:'#64748b', fontSize: 9 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Zone usage */}
            <div style={{ background:'#1c2333', border:'1px solid #2a3650', borderRadius: 12, padding:'18px 20px' }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Tỉ lệ sử dụng bãi</div>
              <div style={{ fontSize: 11, color:'#64748b', marginBottom: 16 }}>Trung bình cả tháng</div>
              {zones.map(z => {
                const pct = z.total > 0 ? Math.round((1 - z.available / z.total) * 100) : 0;
                const col = ZONE_COLOR[z.zone_code] || '#3b82f6';
                return (
                  <div key={z.zone_code} style={{ marginBottom: 14 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 6, fontSize: 12 }}>
                      <span>Bãi {z.zone_code}</span>
                      <span style={{ color: col, fontWeight: 700 }}>{pct}%</span>
                    </div>
                    <div style={{ height: 8, background:'#222b3a', borderRadius: 4 }}>
                      <div style={{ height:'100%', width:`${pct}%`, background: col, borderRadius: 4, transition:'width .6s' }} />
                    </div>
                  </div>
                );
              })}
              <div style={{ marginTop: 14, padding:'10px 12px', background:'#222b3a', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color:'#64748b', marginBottom: 4 }}>Giờ cao điểm</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>07:00 – 09:00</div>
                <div style={{ fontSize: 11, color:'#64748b' }}>Và 16:30 – 18:30</div>
              </div>
            </div>
          </div>

          {/* Top users */}
          <div style={{ background:'#1c2333', border:'1px solid #2a3650', borderRadius: 12, overflow:'hidden' }}>
            <div style={{ padding:'14px 18px', borderBottom:'1px solid #2a3650',
              display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Top người dùng tháng này</span>
              <span style={{ fontSize: 11, color:'#64748b' }}>Xếp hạng theo số lượt</span>
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  {['#','Họ tên','MSSV','Nhóm','Lượt xe','Tổng giờ','Tổng phí'].map(h => (
                    <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize: 11,
                      color:'#64748b', borderBottom:'1px solid #2a3650', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topUsers.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 24, textAlign:'center', color:'#64748b' }}>
                    Chưa có dữ liệu trong kỳ này
                  </td></tr>
                ) : topUsers.map(u => (
                  <tr key={u.rank} style={{ borderBottom:'1px solid rgba(42,54,80,.4)' }}>
                    <td style={{ padding:'12px 16px', fontWeight: 700,
                      color: u.rank===1?'#f59e0b': u.rank===2?'#94a3b8': u.rank===3?'#cd7f32':'#64748b' }}>
                      {u.rank}
                    </td>
                    <td style={{ padding:'12px 16px', fontSize: 13, fontWeight: 500 }}>{u.fullName}</td>
                    <td style={{ padding:'12px 16px', fontFamily:'monospace', fontSize: 12, color:'#94a3b8' }}>{u.hcmutId}</td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ padding:'2px 8px', borderRadius: 20, fontSize: 11,
                        background:'rgba(34,197,94,.12)', color:'#22c55e' }}>
                        {u.role==='STUDENT'?'Sinh viên': u.role==='STAFF'?'Cán bộ': u.role}
                      </span>
                    </td>
                    <td style={{ padding:'12px 16px', fontWeight: 700, color:'#3b82f6' }}>{u.sessions}</td>
                    <td style={{ padding:'12px 16px', color:'#94a3b8' }}>{Math.round(u.durationMinutes/60)}h</td>
                    <td style={{ padding:'12px 16px', fontWeight: 600, color:'#22c55e' }}>
                      {u.amount.toLocaleString('vi-VN')}đ
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
