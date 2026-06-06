import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { MILESTONE_LABELS } from '@speaking-coach/shared';
import type { MilestoneType } from '@speaking-coach/shared';
import { useToast } from '../components/Toast';

const MILESTONE_ICONS: Record<string, string> = {
  streak_7: '🔥',
  streak_30: '🏆',
  sessions_10: '🎯',
  sessions_50: '💪',
  fluency_80: '📈',
  fluency_90: '🌟',
  total_hours_5: '⏱️',
};

const MILESTONE_HINTS: Record<string, string> = {
  streak_7: 'Practice 7 days in a row',
  streak_30: 'Practice 30 days in a row',
  sessions_10: 'Complete 10 sessions',
  sessions_50: 'Complete 50 sessions',
  fluency_80: 'Reach fluency score 80+',
  fluency_90: 'Reach fluency score 90+',
  total_hours_5: 'Practice for 5 hours total',
};

const ALL_MILESTONES: MilestoneType[] = [
  'streak_7', 'streak_30', 'sessions_10', 'sessions_50',
  'fluency_80', 'fluency_90', 'total_hours_5',
];

export default function Milestones() {
  const { showToast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['milestones'],
    queryFn: api.milestones.list,
  });

  const { data: stats } = useQuery({
    queryKey: ['progress-stats'],
    queryFn: api.progress.stats,
  });

  const achieved = new Set(data?.milestones.map((m) => m.type) ?? []);
  const unlockedCount = achieved.size;

  const getProgress = (type: MilestoneType): { current: number; target: number } | null => {
    const streak = stats?.streak;
    const total = stats?.totalSessions ?? 0;
    const minutes = stats?.totalMinutes ?? 0;
    switch (type) {
      case 'streak_7': return { current: streak?.currentStreak ?? 0, target: 7 };
      case 'streak_30': return { current: streak?.currentStreak ?? 0, target: 30 };
      case 'sessions_10': return { current: total, target: 10 };
      case 'sessions_50': return { current: total, target: 50 };
      case 'fluency_80': return { current: stats?.avgFluencyLast7Days ?? 0, target: 80 };
      case 'fluency_90': return { current: stats?.avgFluencyLast7Days ?? 0, target: 90 };
      case 'total_hours_5': return { current: Math.floor(minutes / 60), target: 5 };
      default: return null;
    }
  };

  const handleShare = async (type: MilestoneType) => {
    const label = MILESTONE_LABELS[type];
    const text = `I unlocked "${label}" on SpeakAI! 🎉`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'SpeakAI Milestone', text });
        return;
      } catch { /* fall through */ }
    }
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard', 'success');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const unlocked = ALL_MILESTONES.filter((t) => achieved.has(t));
  const locked = ALL_MILESTONES.filter((t) => !achieved.has(t));

  return (
    <div className="space-y-4 -mt-2">
      <p className="text-[13px] text-text-secondary">{unlockedCount} unlocked</p>

      {unlocked.map((type) => {
        const milestone = data?.milestones.find((m) => m.type === type);
        return (
          <div key={type} className="card-liquid">
            <span className="text-3xl">{MILESTONE_ICONS[type] ?? '🏅'}</span>
            <h3 className="font-serif text-[17px] text-text-primary mt-2">
              {MILESTONE_LABELS[type]?.replace(/[^\w\s-]/g, '').trim() ?? type}
            </h3>
            <p className="text-[13px] text-text-secondary mt-1">{MILESTONE_HINTS[type]}</p>
            {milestone && (
              <p className="text-[11px] text-text-secondary mt-2">
                {new Date(milestone.achievedAt).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </p>
            )}
            <button
              type="button"
              onClick={() => void handleShare(type)}
              className="btn-ghost text-[13px] mt-3 !px-0"
            >
              Share
            </button>
          </div>
        );
      })}

      {locked.map((type) => {
        const progress = getProgress(type);
        return (
          <div key={type} className="card opacity-40">
            <span className="text-3xl blur-[2px]">{MILESTONE_ICONS[type] ?? '🏅'}</span>
            <h3 className="font-serif text-[17px] text-text-primary mt-2">???</h3>
            <p className="text-[13px] text-text-secondary mt-1">{MILESTONE_HINTS[type]}</p>
            {progress && (
              <p className="text-[13px] text-text-secondary mt-2">
                {progress.current} / {progress.target}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
