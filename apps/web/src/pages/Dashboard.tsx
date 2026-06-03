import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';

export default function Dashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['progress-stats'],
    queryFn: api.progress.stats,
  });

  const { data: chartData } = useQuery({
    queryKey: ['fluency-chart', 7],
    queryFn: () => api.progress.fluencyChart(7),
  });

  const { data: readingStats } = useQuery({
    queryKey: ['reading-stats'],
    queryFn: api.reading.stats,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const streak = stats?.streak;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hey, {user?.name ?? 'Learner'} 👋</h1>
          <p className="text-slate-400 text-sm mt-1">Ready for today's session?</p>
        </div>
        <button
          id="practice-now-btn"
          className="btn-primary flex items-center gap-2"
          onClick={() => navigate('/session')}
        >
          <span>🎙</span> Practice Now
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="text-4xl font-extrabold text-orange-400">{streak?.currentStreak ?? 0}</div>
          <div className="text-lg mt-1">🔥 Day Streak</div>
          <div className="text-xs text-slate-500 mt-1">Best: {streak?.longestStreak ?? 0}</div>
        </div>
        <div className="card text-center">
          <div className="text-4xl font-extrabold text-brand-400">{stats?.avgFluencyLast7Days ?? 0}</div>
          <div className="text-sm text-slate-400 mt-1">Avg Fluency (7d)</div>
        </div>
        <div className="card text-center">
          <div className="text-4xl font-extrabold text-emerald-400">{stats?.totalSessions ?? 0}</div>
          <div className="text-sm text-slate-400 mt-1">Total Speaking</div>
        </div>
        <div className="card text-center relative overflow-hidden">
          <div className="text-4xl font-extrabold text-brand-400">{readingStats?.avgReadingScore ?? 0}</div>
          <div className="text-sm text-slate-400 mt-1">Avg Reading</div>
          {readingStats && readingStats.trend !== 0 && (
            <div className={`absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${
              readingStats.trend > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {readingStats.trend > 0 ? '↑' : '↓'} {Math.abs(readingStats.trend)}
            </div>
          )}
        </div>
        <div className="card text-center">
          <div className="text-4xl font-extrabold text-violet-400">{stats?.totalMinutes ?? 0}</div>
          <div className="text-sm text-slate-400 mt-1">Minutes Practiced</div>
        </div>
      </div>

      {/* Fluency Chart */}
      {chartData && chartData.points.length > 0 && (
        <div className="card">
          <h2 className="font-semibold mb-4">Fluency Score — Last 7 Days</h2>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData.points}>
              <XAxis
                dataKey="date"
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#1e1e35', border: '1px solid #2a2a4a', borderRadius: 8 }}
                labelStyle={{ color: '#94a3b8' }}
                itemStyle={{ color: '#5384ff' }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#5384ff"
                strokeWidth={2.5}
                dot={{ fill: '#5384ff', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Sessions */}
      {stats && stats.recentSessions.length > 0 && (
        <div className="card">
          <h2 className="font-semibold mb-4">Recent Sessions</h2>
          <div className="space-y-2">
            {stats.recentSessions.map((s) => (
              <button
                key={s.id}
                onClick={() => navigate(`/session/${s.id}`)}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-surface-border transition-colors text-left"
              >
                <div>
                  <div className="text-sm font-medium">{s.topic}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {s.scenario} · {new Date(s.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className={`text-2xl font-bold ${s.fluencyScore >= 70 ? 'text-emerald-400' : s.fluencyScore >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                  {s.fluencyScore}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {stats && stats.totalSessions === 0 && (
        <div className="card text-center py-12">
          <div className="text-5xl mb-4">🎙</div>
          <h3 className="text-lg font-semibold mb-2">No sessions yet</h3>
          <p className="text-slate-400 text-sm mb-6">Start your first speaking session to see your progress here.</p>
          <button className="btn-primary" onClick={() => navigate('/session')}>
            Start First Session
          </button>
        </div>
      )}
    </div>
  );
}
