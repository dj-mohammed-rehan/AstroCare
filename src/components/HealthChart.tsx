import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TelemetryReading, ThresholdRange } from '../types';
import { formatTimeShort } from '../utils/formatters';

interface HealthChartProps {
  data: TelemetryReading[];
  dataKey: keyof Pick<
    TelemetryReading,
    'heartRate' | 'spo2' | 'bodyTemperature' | 'respiratoryRate' | 'stressIndex' | 'sleepHours'
  >;
  label: string;
  unit: string;
  color?: string;
  domain?: [number | 'auto', number | 'auto'];
  thresholds?: ThresholdRange;
  height?: number;
}

export function HealthChart({
  data,
  dataKey,
  label,
  unit,
  color = '#8AB9E8',
  domain = ['auto', 'auto'],
  thresholds,
  height = 210,
}: HealthChartProps) {
  const gradientId = `grad-${dataKey}`;

  const chartData = data.map((d) => ({
    ...d,
    timeLabel: formatTimeShort(d.timestamp),
  }));

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.28} />
              <stop offset="95%" stopColor={color} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(190, 215, 240, 0.08)" vertical={false} />
          <XAxis
            dataKey="timeLabel"
            tick={{ fill: '#A5B3C3', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(190, 215, 240, 0.14)' }}
            minTickGap={34}
          />
          <YAxis
            domain={domain}
            tick={{ fill: '#A5B3C3', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const point = payload[0].payload as TelemetryReading & { timeLabel: string };
              return (
                <div className="rounded-lg border border-[var(--astra-border)] bg-[#0A111B]/95 px-3 py-2 text-xs shadow-lg">
                  <div className="text-[var(--astra-text-secondary)] font-mono-tabular">
                    {new Date(point.timestamp).toLocaleString([], {
                      month: 'short',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: false,
                    })}
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="font-medium text-[var(--astra-text-primary)]">{label}:</span>
                    <span className="font-mono-tabular font-semibold text-[#B9DDF5]">
                      {point[dataKey]} {unit}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-[var(--astra-text-secondary)]">
                    Activity: {point.activityLevel} (Simulated)
                  </div>
                </div>
              );
            }}
          />
          {thresholds?.warningHigh !== undefined && (
            <ReferenceLine
              y={thresholds.warningHigh}
              stroke="#E8B86D"
              strokeDasharray="4 4"
              strokeOpacity={0.65}
            />
          )}
          {thresholds?.criticalHigh !== undefined && (
            <ReferenceLine
              y={thresholds.criticalHigh}
              stroke="#E77C82"
              strokeDasharray="4 4"
              strokeOpacity={0.75}
            />
          )}
          {thresholds?.warningLow !== undefined && (
            <ReferenceLine
              y={thresholds.warningLow}
              stroke="#E8B86D"
              strokeDasharray="4 4"
              strokeOpacity={0.65}
            />
          )}
          {thresholds?.criticalLow !== undefined && (
            <ReferenceLine
              y={thresholds.criticalLow}
              stroke="#E77C82"
              strokeDasharray="4 4"
              strokeOpacity={0.75}
            />
          )}
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            fillOpacity={1}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
