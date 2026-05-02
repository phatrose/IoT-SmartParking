import { ReactNode } from 'react';

export default function SettingsPage() {
  const rows: { label: string; value: string }[] = [
    { label: 'Hệ thống',          value: 'Smart Parking Management System (SPMS)' },
    { label: 'Phiên bản',         value: 'v1.0.0' },
    { label: 'Trường',            value: 'Đại học Bách Khoa — ĐHQG TP.HCM' },
    { label: 'Địa chỉ',           value: '268 Lý Thường Kiệt, P.14, Q.10, TP.HCM' },
  ];

  const hours = [
    { day: 'Thứ 2 – Thứ 7', range: '06:00 – 22:00', fee: '2.000đ/lượt (ban ngày 06–18h)' },
    { day: 'Buổi tối (T2–T7)', range: '18:00 – 22:00', fee: '3.000đ/lượt' },
    { day: 'Chủ Nhật',       range: '07:00 – 20:00', fee: '3.000đ/lượt (cả ngày)' },
  ];

  const sla = [
    { metric: 'Cập nhật trạng thái slot',  target: '< 5 giây',    status: 'ok' },
    { metric: 'Xử lý cảm biến IoT',        target: '< 5 giây',    status: 'ok' },
    { metric: 'Uptime hệ thống',           target: '≥ 99%',       status: 'ok' },
    { metric: 'Thời gian phản hồi API',    target: '< 200 ms',    status: 'ok' },
  ];

  const card = (title: string, children: ReactNode) => (
    <div style={{ background: '#1c2333', border: '1px solid #2a3650', borderRadius: 12, padding: '18px 20px', marginBottom: 16 }}>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Cài đặt hệ thống</h1>
      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Thông tin cấu hình và SLA hệ thống</p>

      {card('Thông tin hệ thống',
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          {rows.map(r => (
            <tr key={r.label} style={{ borderBottom: '1px solid rgba(42,54,80,.4)' }}>
              <td style={{ padding: '10px 0', fontSize: 12, color: '#64748b', width: '40%' }}>{r.label}</td>
              <td style={{ padding: '10px 0', fontSize: 13, fontWeight: 500 }}>{r.value}</td>
            </tr>
          ))}
        </table>
      )}

      {card('Giờ hoạt động & Biểu phí',
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {hours.map(h => (
            <div key={h.day} style={{ background: '#222b3a', borderRadius: 8, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{h.day}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{h.range}</div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#3b82f6' }}>{h.fee}</span>
            </div>
          ))}
        </div>
      )}

      {card('Chỉ tiêu SLA',
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sla.map(s => (
            <div key={s.metric} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(42,54,80,.3)' }}>
              <span style={{ fontSize: 13 }}>{s.metric}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>{s.target}</span>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
