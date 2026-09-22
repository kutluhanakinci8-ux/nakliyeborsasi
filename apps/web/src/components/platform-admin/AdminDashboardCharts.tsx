"use client";

type SparklineProps = {
  values: number[];
  stroke?: string;
  className?: string;
};

export function AdminSparkline({
  values,
  stroke = "#0d9488",
  className,
}: SparklineProps) {
  const width = 120;
  const height = 36;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1 || 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

type DonutSegment = { label: string; value: number; color: string };

export function AdminDonutChart({
  segments,
  centerLabel,
  centerValue,
}: {
  segments: DonutSegment[];
  centerLabel: string;
  centerValue: string;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  let cumulative = 0;
  const gradientParts = segments.map((seg) => {
    const start = (cumulative / total) * 100;
    cumulative += seg.value;
    const end = (cumulative / total) * 100;
    return `${seg.color} ${start}% ${end}%`;
  });

  return (
    <div className="admin-donut">
      <div
        className="admin-donut-ring"
        style={{ background: `conic-gradient(${gradientParts.join(", ")})` }}
        role="img"
        aria-label={centerLabel}
      >
        <div className="admin-donut-hole">
          <strong>{centerValue}</strong>
          <span>{centerLabel}</span>
        </div>
      </div>
      <ul className="admin-donut-legend">
        {segments.map((seg) => (
          <li key={seg.label}>
            <span className="admin-donut-swatch" style={{ background: seg.color }} />
            <span className="admin-donut-legend-label">{seg.label}</span>
            <span className="admin-donut-legend-value">{seg.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AdminBarChart({
  items,
}: {
  items: { label: string; value: number; displayValue: string; color: string }[];
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="admin-bar-chart">
      {items.map((item) => (
        <li key={item.label}>
          <div className="admin-bar-chart-meta">
            <span>{item.label}</span>
            <span>{item.displayValue}</span>
          </div>
          <div className="admin-bar-chart-track">
            <div
              className="admin-bar-chart-fill"
              style={{
                width: `${(item.value / max) * 100}%`,
                background: item.color,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function buildTrendSeries(seed: number, points = 7): number[] {
  const base = Math.max(seed, 1);
  return Array.from({ length: points }, (_, i) => {
    const wave = Math.sin(i * 0.9 + seed) * 0.12 + 1;
    const growth = 0.85 + i * 0.04;
    return Math.round(base * wave * growth);
  });
}
