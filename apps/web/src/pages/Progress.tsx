import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';
import { api } from '../lib/api';
import LottieDuck from '../components/LottieDuck';
import Header from '../components/Header';
import type { HeatmapDay } from '@speaking-coach/shared';

function Heatmap({ data }: { data: HeatmapDay[] }) {
  const byDate = new Map(data.map((d) => [d.date, d.count]));
  const today = new Date();
  const days: { date: string; count: number }[] = [];

  for (let i = 210; i >= 0; i--) { // Show ~7 months for mobile
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, count: byDate.get(key) ?? 0 });
  }

  const cellColor = (count: number) => {
    if (count === 0) return 'bg-line opacity-30';
    if (count === 1) return 'bg-accent/40';
    if (count === 2) return 'bg-accent/70';
    return 'bg-accent shadow-[0_0_8px_rgba(26,115,232,0.4)]';
  };

  const weeks: (typeof days)[] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div className="overflow-x-auto pb-2 custom-scrollbar">
      <div className="flex gap-1 min-w-max">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day) => (
              <div
                key={day.date}
                title={`${day.date}: ${day.count} session${day.count !== 1 ? 's' : ''}`}
                className={`w-3 h-3 rounded-[3px] transition-all ${cellColor(day.count)}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-4 text-[10px] font-bold uppercase tracking-widest text-text-secondary">
        <span>Less</span>
        {[0, 1, 2, 3].map((v) => (
          <div key={v} className={`w-3 h-3 rounded-[3px] ${cellColor(v)}`} />
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
    <div className="space-y-8 animate-fade-up pb-8">
      <Header title="Progress" showBack={true} />
      
      {/* Centered Lottie Hero (Minimalist) */}
      <div className="text-center pt-2">
        <LottieDuck type="search" size={120} className="mx-auto" />
      </div>

      {/* Activity Section */}
      <div className="card shadow-sm !p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-[12px] font-black uppercase tracking-widest text-text-secondary">Activity Heatmap</p>
          <span className="text-[11px] font-bold text-accent px-2 py-0.5 bg-accent/10 rounded-full">Last 7 Months</span>
        </div>
        {heatmapData ? (
          <Heatmap data={heatmapData.heatmap} />
        ) : (
          <div className="h-20 animate-pulse bg-bg-subtle rounded-xl" />
        )}
      </div>

      {/* Fluency Chart */}
      <div className="card shadow-sm !p-6">
        <div className="flex flex-col gap-4 mb-6">
          <p className="text-[12px] font-black uppercase tracking-widest text-text-secondary">Fluency Progress</p>
          <div className="flex p-0.5 bg-bg-subtle rounded-xl border border-line w-fit">
            {([7, 30, 90] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={`px-4 py-1.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all ${
                  days === d 
                    ? 'bg-white dark:bg-bg-subtle text-accent shadow-sm' 
                    : 'text-text-secondary'
                }`}
              >
                {d}D
              </button>
            ))}
          </div>
        </div>

        {chartData && chartData.points.length > 0 ? (
          <div className="h-48 -mx-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.points}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: '1px solid var(--color-line)',
                    backgroundColor: 'rgba(255,255,255,0.8)',
                    backdropFilter: 'blur(8px)',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="score" 
                  stroke="var(--color-accent)" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorScore)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-40 flex flex-col items-center justify-center text-text-secondary text-[13px] gap-2">
            <span className="text-2xl opacity-30">📊</span>
            Keep practicing to see your chart
          </div>
        )}
      </div>

      {/* Mistake Categories */}
      <div className="card shadow-sm !p-6">
        <p className="text-[12px] font-black uppercase tracking-widest text-text-secondary mb-6">Error Categories</p>
        <div className="space-y-6">
          {(['grammar', 'vocabulary', 'pronunciation'] as const).map((cat) => (
            <div key={cat} className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-[13px] font-bold text-text-primary uppercase tracking-tight">{cat}</span>
                <span className="text-[12px] font-black text-accent">{categoryTotals[cat]}%</span>
              </div>
              <div className="progress-bar h-2.5">
                <div 
                  className="progress-bar-fill shadow-[0_0_8px_rgba(26,115,232,0.3)] transition-all duration-1000" 
                  style={{ width: `${categoryTotals[cat]}%` }} 
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recurring Patterns */}
      {patterns.length > 0 && (
        <div className="card shadow-sm !p-6">
          <p className="text-[12px] font-black uppercase tracking-widest text-text-secondary mb-4">Recurring Patterns</p>
          <div className="space-y-3">
            {patterns.slice(0, 8).map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-bg-subtle border border-line/30">
                <span className="text-[14px] font-medium text-text-primary truncate pr-2">{p.pattern}</span>
                <div className="flex items-center gap-2 shrink-0">
                   <div className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                     p.resolved ? 'bg-[#34a853]/10 text-[#34a853]' : 'bg-orange-500/10 text-orange-500'
                   }`}>
                     {p.resolved ? 'Fixed' : 'Active'}
                   </div>
                  <span className="text-[12px] font-bold text-text-secondary">{p.occurrences}×</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
