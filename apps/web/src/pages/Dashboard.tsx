import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

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

  const { data: patternsData } = useQuery({
    queryKey: ['error-patterns'],
    queryFn: api.progress.errorPatterns,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const streak = stats?.streak;
  const fluency = stats?.avgFluencyLast7Days ?? 0;
  const topMistakes = (patternsData?.patterns ?? [])
    .filter((p) => !p.resolved)
    .slice(0, 3);

  const chartPoints = chartData?.points ?? [];
  const prevScore = chartPoints.length >= 2 ? chartPoints[chartPoints.length - 2]!.score : fluency;
  const delta = fluency - prevScore;

  const todayDone = streak?.lastActiveDate === new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-0">
      <div className="py-2">
        <h1 className="font-serif text-[22px] text-text-primary">
          {getGreeting()}, {user?.name?.split(' ')[0] ?? 'Learner'} 👋
        </h1>
        <p className="text-[13px] text-text-secondary mt-0.5">{formatDate()}</p>
      </div>

      <div className="divider my-4" />

      <div className="py-2">
        <p className="text-[15px] font-medium text-text-primary">
          🔥{' '}
          <span className="font-serif text-2xl text-accent">{streak?.currentStreak ?? 0}</span>
          <span className="text-text-secondary font-normal">-day streak</span>
        </p>
        <div className="flex items-center gap-3 mt-2">
          <div className="progress-bar flex-1">
            <div
              className="progress-bar-fill"
              style={{ width: todayDone ? '100%' : '60%' }}
            />
          </div>
          <span className="text-[13px] text-text-secondary whitespace-nowrap">
            Today: {todayDone ? 'done ✓' : 'pending'}
          </span>
        </div>
      </div>

      <div className="divider my-4" />

      <div className="py-2">
        <p className="section-label mb-3">Fluency</p>
        <div className="flex items-baseline gap-2">
          <span className="font-serif text-5xl text-text-primary score-number">{fluency}</span>
          {delta !== 0 && (
            <span className={`text-[13px] ${delta > 0 ? 'text-[#34a853]' : 'text-[#d93025]'}`}>
              {delta > 0 ? '↑' : '↓'}{Math.abs(delta)} this week
            </span>
          )}
        </div>
        {chartPoints.length > 0 && (
          <div className="h-16 mt-3 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartPoints}>
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#1a73e8"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {topMistakes.length > 0 && (
        <>
          <div className="divider my-4" />
          <div className="py-2">
            <p className="section-label mb-3">Top mistakes this week</p>
            {topMistakes.map((m) => (
              <div key={m.id} className="list-item flex items-center justify-between">
                <span className="text-[15px] text-text-primary">{m.pattern}</span>
                <span className="text-[13px] text-text-secondary">{m.occurrences}×</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="divider my-4" />

      <div className="flex flex-col gap-2 pt-2 pb-4">
        <button type="button" className="btn-primary" onClick={() => navigate('/session')}>
          🎙 Start Speaking
        </button>
        <button type="button" className="btn-secondary" onClick={() => navigate('/reading')}>
          📖 Start Reading
        </button>
      </div>
    </div>
  );
}
