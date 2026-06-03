import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { MILESTONE_LABELS } from '@speaking-coach/shared';
import type { MilestoneType } from '@speaking-coach/shared';

const MILESTONE_ICONS: Record<string, string> = {
  streak_7: '🔥',
  streak_30: '🏆',
  sessions_10: '🎯',
  sessions_50: '💪',
  fluency_80: '📈',
  fluency_90: '🌟',
  total_hours_5: '⏱️',
};

const ALL_MILESTONES: MilestoneType[] = [
  'streak_7', 'streak_30', 'sessions_10', 'sessions_50',
  'fluency_80', 'fluency_90', 'total_hours_5',
];

export default function Milestones() {
  const { data, isLoading } = useQuery({
    queryKey: ['milestones'],
    queryFn: api.milestones.list,
  });

  const achieved = new Set(data?.milestones.map((m) => m.type) ?? []);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold">Achievements</h1>
        <p className="text-slate-400 text-sm mt-1">
          {achieved.size} / {ALL_MILESTONES.length} unlocked
        </p>
      </div>

      {/* Progress bar */}
      <div className="card">
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="text-slate-400">Overall progress</span>
          <span className="font-semibold">{Math.round((achieved.size / ALL_MILESTONES.length) * 100)}%</span>
        </div>
        <div className="w-full bg-surface-elevated rounded-full h-2.5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-violet-500 rounded-full transition-all duration-700"
            style={{ width: `${(achieved.size / ALL_MILESTONES.length) * 100}%` }}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {ALL_MILESTONES.map((type) => {
            const isUnlocked = achieved.has(type);
            const milestone = data?.milestones.find((m) => m.type === type);

            return (
              <div
                key={type}
                id={`milestone-${type}`}
                className={`card transition-all ${isUnlocked ? 'border-amber-500/40 bg-amber-500/5' : 'opacity-50'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`text-4xl ${isUnlocked ? '' : 'grayscale opacity-50'}`}>
                    {MILESTONE_ICONS[type] ?? '🏅'}
                  </div>
                  <div className="flex-1">
                    <div className={`font-semibold ${isUnlocked ? 'text-amber-300' : 'text-slate-400'}`}>
                      {MILESTONE_LABELS[type as MilestoneType] ?? type}
                    </div>
                    {isUnlocked && milestone ? (
                      <div className="text-xs text-slate-500 mt-0.5">
                        Achieved {new Date(milestone.achievedAt).toLocaleDateString()}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-600 mt-0.5">Not yet unlocked</div>
                    )}
                  </div>
                  {isUnlocked && (
                    <span className="text-amber-400 text-xl">✓</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
