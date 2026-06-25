import { useMemo } from "react";

export default function HistoryChart({ history }) {
  const points = useMemo(() => {
    const byTimestamp = new Map();
    for (const row of history) {
      byTimestamp.set(row.timestamp, (byTimestamp.get(row.timestamp) || 0) + row.total_mb);
    }
    return [...byTimestamp.entries()].sort((a, b) => a[0] - b[0]);
  }, [history]);

  if (points.length < 2) {
    return <div className="text-xs text-slate-700 py-2">Not enough history yet — snapshots are recorded every 5 minutes.</div>;
  }

  const width = 760, height = 120, pad = 8;
  const maxVal = Math.max(...points.map((p) => p[1]), 1);
  const stepX = (width - pad * 2) / (points.length - 1);
  const coords = points.map(([, val], i) => {
    const x = pad + i * stepX;
    const y = height - pad - (val / maxVal) * (height - pad * 2);
    return [x, y];
  });
  const linePath = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${coords[coords.length - 1][0].toFixed(1)},${height - pad} L${coords[0][0].toFixed(1)},${height - pad} Z`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <path d={areaPath} fill="#3b82f618" stroke="none" />
      <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
