'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
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
  return <circle cx={cx} cy={cy} r={4} fill={color} stroke="#0a0f1a" strokeWidth={1.5} />;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as RatingChartPoint;
  const isWin = d.result === 'win';
  const isLoss = d.result === 'loss';
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 text-xs shadow-xl">
      <p className="font-black text-base tabular-nums text-[var(--color-foreground)]">{d.rating_display}</p>
      <p className="text-[var(--color-muted-foreground)] mt-0.5">{d.opponent_nickname}</p>
      {(isWin || isLoss) && (
        <p className={`font-bold mt-0.5 ${isWin ? 'text-[var(--color-win)]' : 'text-[var(--color-loss)]'}`}>
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
  const padding = Math.max(50, (maxRating - minRating) * 0.25);
  const domain: [number, number] = [Math.floor(minRating - padding), Math.ceil(maxRating + padding)];

  const initialRating = data[0]?.rating_display ?? 1000;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-card">
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="ratingGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00c8ff" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#00c8ff" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
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
            stroke="rgba(255,255,255,0.12)"
            strokeDasharray="4 4"
          />
          <Area
            type="monotone"
            dataKey="rating_display"
            stroke="#00c8ff"
            strokeWidth={2.5}
            fill="url(#ratingGradient)"
            dot={<CustomDot />}
            activeDot={{ r: 6, fill: '#00c8ff', stroke: '#0a0f1a', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
