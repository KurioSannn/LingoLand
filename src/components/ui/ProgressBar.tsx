export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const safeMax = max > 0 ? max : 1;
  const pct = Math.min(100, Math.max(0, Math.round((value / safeMax) * 100)));
  return (
    <div className="progress-block">
      <div className="progress-label">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div
        className="progress-bar"
        role="progressbar"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
