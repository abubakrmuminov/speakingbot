import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, ResponsiveContainer } from 'recharts';
import { api } from '../lib/api';
import type { HeatmapDay } from '@speaking-coach/shared';

function Heatmap({ data }: { data: HeatmapDay[] }) {
  const byDate = new Map(data.map((d) => [d.date, d.count]));
  const today = new Date();
  const days: { date: string; count: number }[] = [];

  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, count: byDate.get(key) ?? 0 });
  }

  const cellColor = (count: number) => {
    if (count === 0) return 'bg-line';
    if (count === 1) return 'bg-[#93c4fd]';
    return 'bg-accent';
  };

  const weeks: (typeof days)[] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-0.5 min-w-max">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {week.map((day) => (
              <div
                key={day.date}
                title={`${day.date}: ${day.count} session${day.count !== 1 ? 's' : ''}`}
                className={`w-2.5 h-2.5 rounded-sm ${cellColor(day.count)}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 mt-3 text-[11px] text-text-secondary">
        <span>Less</span>
        {[0, 1, 3].map((v) => (
          <div key={v} className={`w-2.5 h-2.5 rounded-sm ${cellColor(v)}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

export default function Progress() {
  const [days, setDays] = useState<7 | 30 | 90>(30);

  const { data: heatmapData } = useQuery({
    queryKey: ['heatmap'],
    queryFn: api.progress.heatmap,
  });

  const { data: chartData } = useQuery({
    queryKey: ['fluency-chart', days],
    queryFn: () => api.progress.fluencyChart(days),
  });

  const { data: patternsData } = useQuery({
    queryKey: ['error-patterns'],
    queryFn: api.progress.errorPatterns,
  });

  const categoryTotals = (() => {
    if (!patternsData) return { grammar: 0, vocabulary: 0, pronunciation: 0 };
    const counts: Record<string, number> = { grammar: 0, vocabulary: 0, pronunciation: 0 };
    for (const p of patternsData.patterns) {
      counts[p.category] = (counts[p.category] ?? 0) + p.occurrences;
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    return {
      grammar: Math.round(((counts.grammar ?? 0) / total) * 100),
      vocabulary: Math.round(((counts.vocabulary ?? 0) / total) * 100),
      pronunciation: Math.round(((counts.pronunciation ?? 0) / total) * 100),
    };
  })();

  const patterns = patternsData?.patterns ?? [];

  return (
    <div className="space-y-0 -mt-2">
      <div className="py-2">
        <p className="section-label mb-3">Activity</p>
        {heatmapData ? (
          <Heatmap data={heatmapData.heatmap} />
        ) : (
          <div className="h-20 flex items-center justify-center text-text-secondary text-[13px]">Loading…</div>
        )}
      </div>

      <div className="divider my-4" />

      <div className="py-2">
        <p className="section-label mb-3">Fluency over time</p>
        <div className="flex gap-2 mb-4">
          {([7, 30, 90] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={days === d ? 'toggle-btn-active' : 'toggle-btn'}
            >
              {d}d
            </button>
          ))}
        </div>
        {chartData && chartData.points.length > 0 ? (
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData.points}>
              <XAxis
                dataKey="date"
                tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }}
                tickFormatter={(v: string) => v.slice(5)}
                axisLine={false}
                tickLine={false}
              />
              <Line type="monotone" dataKey="score" stroke="#1a73e8" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-[13px] text-text-secondary text-center py-8">No data yet</p>
        )}
      </div>

      <div className="divider my-4" />

      <div className="py-2">
        <p className="section-label mb-4">Mistakes by category</p>
        {(['grammar', 'vocabulary', 'pronunciation'] as const).map((cat) => (
          <div key={cat} className="flex items-center gap-3 mb-3">
            <span className="text-[15px] text-text-primary w-28 capitalize">{cat}</span>
            <div className="progress-bar flex-1 h-2">
              <div className="progress-bar-fill h-2" style={{ width: `${categoryTotals[cat]}%` }} />
            </div>
            <span className="text-[13px] text-text-secondary w-8">{categoryTotals[cat]}%</span>
          </div>
        ))}
      </div>

      {patterns.length > 0 && (
        <>
          <div className="divider my-4" />
          <div className="py-2">
            <p className="section-label mb-3">Recurring patterns</p>
            {patterns.slice(0, 10).map((p) => (
              <div key={p.id} className="list-item flex items-center justify-between">
                <span className="text-[15px] text-text-primary">{p.pattern}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[13px] text-text-secondary">{p.occurrences}×</span>
                  <span className={p.resolved ? 'badge-green' : 'badge-gray'}>
                    {p.resolved ? 'resolved ✓' : 'active'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
