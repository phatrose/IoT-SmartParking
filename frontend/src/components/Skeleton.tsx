interface SkProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: React.CSSProperties;
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 6, style }: SkProps) {
  return <div className="sk" style={{ width, height, borderRadius, ...style }} />;
}

export function SkeletonCard({ style }: { style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#1c2333', border: '1px solid #2a3650', borderRadius: 12, padding: '18px 20px', ...style }}>
      <Skeleton width="40%" height={12} style={{ marginBottom: 10 }} />
      <Skeleton width="60%" height={32} style={{ marginBottom: 8 }} />
      <Skeleton width="50%" height={10} />
    </div>
  );
}
