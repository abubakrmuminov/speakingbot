import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { api } from '../lib/api';
import type { HeatmapDay } from '@speaking-coach/shared';

// ─── GitHub-style Heatmap ─────────────────────────────────────────────────
function Heatmap({ data }: { data: HeatmapDay[] }) {
  const byDate = new Map(data.map((d) => [d.date, d.count]));

  // Build 52-week grid ending today
  const today = new Date();
  const days: { date: string; count: number }[] = [];
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, count: byDate.get(key) ?? 0 });
  }

  const cellColor = (count: number) => {
    if (count === 0) return 'bg-surface-elevated';
    if (count === 1) return 'bg-brand-800';
    if (count === 2) return 'bg-brand-600';
    if (count === 3) return 'bg-brand-500';
    return 'bg-brand-400';
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
                className={`w-3 h-3 rounded-sm ${cellColor(day.count)} transition-colors hover:opacity-80`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((v) => (
          <div key={v} className={`w-3 h-3 rounded-sm ${cellColor(v)}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

const PIE_COLORS = { grammar: '#5384ff', vocabulary: '#f59e0b', pronunciation: '#ef4444' };

export default function Progress() {
  const [days, setDays] = useState<30 | 90>(30);

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

  // Build pie data from error patterns
  const pieData = (() => {
    if (!patternsData) return [];
    const counts: Record<string, number> = {};
    for (const p of patternsData.patterns) {
      counts[p.category] = (counts[p.category] ?? 0) + p.occurrences;
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  const activePatterns = patternsData?.patterns.filter((p) => !p.resolved) ?? [];
  const resolvedPatterns = patternsData?.patterns.filter((p) => p.resolved) ?? [];

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <h1 className="text-2xl font-bold">Progress</h1>

      {/* Heatmap */}
      <div className="card">
        <h2 className="font-semibold mb-4">Activity — Last 365 Days</h2>
        {heatmapData ? <Heatmap data={heatmapData.heatmap} /> : (
          <div className="h-20 flex items-center justify-center text-slate-500">Loading…</div>
        )}
      </div>

      {/* Fluency Chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Fluency Trend</h2>
          <div className="flex gap-1">
            {([30, 90] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${days === d ? 'bg-brand-500 text-white' : 'bg-surface-elevated text-slate-400 hover:text-white'}`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        {chartData && chartData.points.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData.points}>
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
              <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#1e1e35', border: '1px solid #2a2a4a', borderRadius: 8 }}
                labelStyle={{ color: '#94a3b8' }}
                itemStyle={{ color: '#5384ff' }}
              />
              <Line type="monotone" dataKey="score" stroke="#5384ff" strokeWidth={2.5} dot={{ fill: '#5384ff', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-40 flex items-center justify-center text-slate-500">No data yet — complete some sessions!</div>
        )}
      </div>

      {/* Error Breakdown */}
      {pieData.length > 0 && (
        <div className="card">
          <h2 className="font-semibold mb-4">Error Breakdown</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {pieData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={PIE_COLORS[entry.name as keyof typeof PIE_COLORS] ?? '#888'}
                  />
                ))}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Error Patterns List */}
      {activePatterns.length > 0 && (
        <div className="card">
          <h2 className="font-semibold mb-4">Active Error Patterns ({activePatterns.length})</h2>
          <div className="space-y-2">
            {activePatterns.slice(0, 10).map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-surface-elevated rounded-xl">
                <div>
                  <div className="font-medium text-sm">{p.pattern}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`badge text-xs ${p.category === 'grammar' ? 'badge-blue' : p.category === 'vocabulary' ? 'badge-amber' : 'badge-red'}`}>
                      {p.category}
                    </span>
                    <span className="text-xs text-slate-500">Last seen: {new Date(p.lastSeen).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-400">{p.occurrences}×</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {resolvedPatterns.length > 0 && (
        <div className="card">
          <h2 className="font-semibold mb-4 text-emerald-400">✅ Resolved Patterns ({resolvedPatterns.length})</h2>
          <div className="space-y-2">
            {resolvedPatterns.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 bg-emerald-500/5 rounded-xl opacity-75">
                <span className="text-emerald-400">✓</span>
                <span className="text-sm text-slate-400 line-through">{p.pattern}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
