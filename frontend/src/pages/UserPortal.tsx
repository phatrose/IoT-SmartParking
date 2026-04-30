/**
 * src/pages/UserPortal.tsx
 * Cổng cá nhân cho Sinh viên / Cán bộ – xem dư nợ + thanh toán BKPay
 */
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { billingApi, parkingApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const STATUS_COLOR: Record<string, string> = {
  PENDING: '#f59e0b', PROCESSING: '#3b82f6', SUCCESS: '#22c55e',
  FAILED: '#ef4444', REFUNDED: '#94a3b8',
};

export default function UserPortal() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [paying, setPaying] = useState<number | null>(null);
  const [log, setLog] = useState<{ msg: string; type: string }[]>([]);

  const load = useCallback(async () => {
    try {
      const [s, h] = await Promise.all([
        billingApi.myBilling(),
        parkingApi.myHistory(),
      ]);
      setSummary(s.data);
      setHistory(h.data);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const addLog = (msg: string, type = 'info') => setLog(p => [...p, { msg, type }]);

  const handlePay = async (paymentId: number, amount: number) => {
    setPaying(paymentId);
    setLog([]);
    addLog(`⟳ Kết nối BKPay queue...`, 'info');
    addLog(`→ POST /api/billing/pay/${paymentId}`, 'api');
    addLog(`  { amount: ${amount} VND }`, 'api');

    try {
      const { data } = await billingApi.payNow(paymentId);
      if (data.success) {
        addLog(`← 200 OK { txn: "${data.txn_id}", status: "SUCCESS" }`, 'success');
      } else {
        addLog(`← Đang xử lý qua queue (auto-retry nếu fail)`, 'info');
      }
      await load();
    } catch (err: any) {
      addLog(`← ERROR: ${err.message}`, 'error');
    } finally {
      setPaying(null);
    }
  };

  if (!summary) return <div style={{ color: '#64748b', padding: 20 }}>{t('common.loading')}</div>;

  const pending = summary.payments.filter((p: any) => p.status === 'PENDING' || p.status === 'PROCESSING');
  const totalPending = pending.reduce((s: number, p: any) => s + Number(p.amount), 0);
  const isExempt = summary.isExempt;

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ background: '#1c2333', border: '1px solid #2a3650', borderRadius: 10,
        padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#3b82f6',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff' }}>
          {user?.fullName[0]}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{user?.fullName}</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>
            {user?.hcmutId} · {t('roles.' + user?.role)} · {user?.licensePlate || '—'}
          </div>
        </div>
        <span style={{
          padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500,
          background: isExempt ? 'rgba(34,197,94,.15)' : 'rgba(59,130,246,.15)',
          color: isExempt ? '#22c55e' : '#3b82f6',
        }}>{isExempt ? '✅ ' + t('user_portal.exempt_label') : '💳 STANDARD'}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 14 }}>
        {/* Left: Balance + payments */}
        <div>
          <div style={{
            background: isExempt ? 'linear-gradient(135deg,#16a34a,#22c55e)' :
                        totalPending > 0 ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' :
                        'linear-gradient(135deg,#16a34a,#22c55e)',
            borderRadius: 12, padding: 22, color: '#fff', marginBottom: 14,
          }}>
            <div style={{ fontSize: 11, opacity: .8 }}>
              {t('user_portal.outstanding')} – {summary.currentPeriod}
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, fontFamily: 'monospace', margin: '6px 0' }}>
              {isExempt ? t('user_portal.exempt_label') :
               totalPending > 0 ? `${totalPending.toLocaleString('vi-VN')}đ` : '0đ'}
            </div>
            <div style={{ fontSize: 11, opacity: .85 }}>
              {t('user_portal.duration', { minutes: summary.durationMinutes })}
            </div>
          </div>

          {pending.length > 0 && !isExempt && (
            <div style={{ background: '#1c2333', border: '1px solid #2a3650', borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
              <div style={{ padding: '11px 14px', borderBottom: '1px solid #2a3650', fontWeight: 600, fontSize: 13 }}>
                {pending.length} thanh toán chờ xử lý
              </div>
              {pending.map((p: any) => (
                <div key={p.id} style={{ padding: '12px 14px', borderBottom: '1px solid rgba(42,54,80,.4)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 12 }}>Kỳ {p.billingPeriod}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                      {p.totalDuration} phút · status: <code style={{ color: STATUS_COLOR[p.status] }}>{p.status}</code>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                      {Number(p.amount).toLocaleString('vi-VN')}đ
                    </span>
                    <button onClick={() => handlePay(p.id, p.amount)} disabled={paying === p.id}
                      style={{
                        padding: '7px 14px', borderRadius: 7,
                        background: paying === p.id ? '#374151' : '#7c3aed',
                        color: '#fff', border: 'none', fontSize: 12, fontWeight: 600,
                        cursor: paying === p.id ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                      }}>
                      {paying === p.id ? t('user_portal.processing') : '💳 ' + t('user_portal.pay_now')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isExempt && (
            <div style={{ background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.2)',
              borderRadius: 10, padding: 16, color: '#22c55e', fontSize: 13 }}>
              ✅ {t('user_portal.exempt_message')}
            </div>
          )}
        </div>

        {/* Right: BKPay log + history */}
        <div>
          <div style={{ background: '#1c2333', border: '1px solid #2a3650', borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ padding: '11px 14px', borderBottom: '1px solid #2a3650', fontWeight: 600, fontSize: 13 }}>
              BKPay Queue Log
            </div>
            <div style={{ padding: 12, minHeight: 100, maxHeight: 160, overflowY: 'auto', fontFamily: 'monospace', fontSize: 11 }}>
              {log.length === 0 ?
                <span style={{ color: '#555' }}>Nhấn "BKPay" để xem log...</span> :
                log.map((l, i) => (
                  <div key={i} style={{ marginBottom: 3,
                    color: l.type === 'success' ? '#22c55e' :
                           l.type === 'error' ? '#ef4444' :
                           l.type === 'api' ? '#3b82f6' : '#f59e0b' }}>
                    {l.msg}
                  </div>
                ))
              }
            </div>
          </div>

          <div style={{ background: '#1c2333', border: '1px solid #2a3650', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '11px 14px', borderBottom: '1px solid #2a3650', fontWeight: 600, fontSize: 13 }}>
              {t('user_portal.history')}
            </div>
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              {summary.payments.length === 0 ?
                <div style={{ padding: 20, textAlign: 'center', color: '#64748b', fontSize: 12 }}>
                  {t('user_portal.no_payments')}
                </div> :
                summary.payments.map((p: any) => (
                  <div key={p.id} style={{ padding: '11px 14px', borderBottom: '1px solid rgba(42,54,80,.4)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 12 }}>Kỳ {p.billingPeriod}</div>
                      <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace', marginTop: 1 }}>
                        {p.bkpayTxnId || '—'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>
                        {Number(p.amount).toLocaleString('vi-VN')}đ
                      </div>
                      <span style={{
                        padding: '2px 7px', borderRadius: 20, fontSize: 10, fontWeight: 500,
                        background: `${STATUS_COLOR[p.status]}20`, color: STATUS_COLOR[p.status],
                      }}>{t(`user_portal.status.${p.status}`)}</span>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>

      {/* Parking history */}
      <div style={{ background: '#1c2333', border: '1px solid #2a3650', borderRadius: 10, overflow: 'hidden', marginTop: 14 }}>
        <div style={{ padding: '11px 14px', borderBottom: '1px solid #2a3650', fontWeight: 600, fontSize: 13 }}>
          {t('user_portal.parking_history')}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
            <thead>
              <tr>
                {['Vào', 'Ra', 'Slot', 'Thời gian', 'Trạng thái'].map(h => (
                  <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11,
                    color: '#64748b', borderBottom: '1px solid #2a3650', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ?
                <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>
                  {t('common.no_data')}
                </td></tr> :
                history.slice(0, 20).map((s: any) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid rgba(42,54,80,.4)' }}>
                    <td style={{ padding: '10px 14px', fontSize: 11, fontFamily: 'monospace' }}>
                      {new Date(s.entryTime).toLocaleString('vi-VN')}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 11, fontFamily: 'monospace' }}>
                      {s.exitTime ? new Date(s.exitTime).toLocaleString('vi-VN') : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 11 }}>{s.slot?.slotCode || '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12 }}>
                      {s.durationMinutes ? `${s.durationMinutes} phút` : '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        padding: '2px 7px', borderRadius: 20, fontSize: 10,
                        background: s.status === 'CLOSED' ? 'rgba(34,197,94,.15)' : 'rgba(59,130,246,.15)',
                        color: s.status === 'CLOSED' ? '#22c55e' : '#3b82f6',
                      }}>{s.status}</span>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
