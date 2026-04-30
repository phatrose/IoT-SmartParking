import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem { id: number; msg: string; type: ToastType; }

interface ToastCtx { toast: (msg: string, type?: ToastType) => void; }

const Ctx = createContext<ToastCtx>({ toast: () => {} });

export function useToast() { return useContext(Ctx); }

const COLORS: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: 'rgba(34,197,94,.12)',  border: '#22c55e', icon: '✓' },
  error:   { bg: 'rgba(239,68,68,.12)',  border: '#ef4444', icon: '✕' },
  warning: { bg: 'rgba(245,158,11,.12)', border: '#f59e0b', icon: '⚠' },
  info:    { bg: 'rgba(59,130,246,.12)', border: '#3b82f6', icon: 'ℹ' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const toast = useCallback((msg: string, type: ToastType = 'info') => {
    const id = ++counter.current;
    setItems(p => [...p, { id, msg, type }]);
    setTimeout(() => setItems(p => p.filter(t => t.id !== id)), 3500);
  }, []);

  const remove = (id: number) => setItems(p => p.filter(t => t.id !== id));

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none',
      }}>
        {items.map(item => {
          const c = COLORS[item.type];
          return (
            <div key={item.id}
              onClick={() => remove(item.id)}
              style={{
                background: '#1c2333', border: `1px solid ${c.border}`,
                borderLeft: `3px solid ${c.border}`,
                borderRadius: 8, padding: '10px 14px',
                display: 'flex', alignItems: 'center', gap: 10,
                fontSize: 13, color: '#e2e8f0', minWidth: 260, maxWidth: 380,
                boxShadow: '0 4px 20px rgba(0,0,0,.4)',
                pointerEvents: 'all', cursor: 'pointer',
                animation: 'slideIn .2s ease',
              }}>
              <span style={{ color: c.border, fontWeight: 700, fontSize: 15 }}>{c.icon}</span>
              <span style={{ flex: 1 }}>{item.msg}</span>
            </div>
          );
        })}
      </div>
      <style>{`@keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}`}</style>
    </Ctx.Provider>
  );
}
