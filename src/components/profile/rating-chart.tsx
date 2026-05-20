'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Dot,
} from 'recharts';
import type { RatingChartPoint } from '@/types/app';

interface Props {
  data: RatingChartPoint[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomDot(props: any) {
  const { cx, cy, payload } = props;
  if (!payload) return null;
  const color = payload.result === 'win' ? '#22c55e' : payload.result === 'loss' ? '#ef4444' : '#00c8ff';
  return <circle cx={cx} cy={cy} r={4} fill={color} stroke="none" />;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as RatingChartPoint;
  const isWin = d.result === 'win';
  const isLoss = d.result === 'loss';
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-3 text-xs shadow-xl">
      <p className="font-bold text-sm">{d.rating_display}</p>
      <p className="text-[var(--color-muted-foreground)]">{d.opponent_nickname}</p>
      {(isWin || isLoss) && (
        <p className={isWin ? 'text-[var(--color-win)] font-semibold' : 'text-[var(--color-loss)] font-semibold'}>
          {isWin ? '勝利' : '敗北'}
        </p>
      )}
    </div>
  );
}

export function RatingChart({ data }: Props) {
  const ratings = data.map(d => d.rating_display);
  const minRating = Math.min(...ratings);
  const maxRating = Math.max(...ratings);
  const padding = Math.max(50, (maxRating - minRating) * 0.2);
  const domain: [number, number] = [Math.floor(minRating - padding), Math.ceil(maxRating + padding)];

  const initialRating = data[0]?.rating_display ?? 1000;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="date"
            tick={false}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={domain}
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickCount={5}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={initialRating}
            stroke="rgba(255,255,255,0.15)"
            strokeDasharray="4 4"
          />
          <Line
            type="monotone"
            dataKey="rating_display"
            stroke="#00c8ff"
            strokeWidth={2}
            dot={<CustomDot />}
            activeDot={{ r: 6, fill: '#00c8ff', stroke: '#0a0f1a', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
