import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { MILESTONE_LABELS } from '@speaking-coach/shared';
import type { MilestoneType } from '@speaking-coach/shared';
import { useToast } from '../components/Toast';
import LottieDuck from '../components/LottieDuck';
import Header from '../components/Header';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['milestones'],
    queryFn: api.milestones.list,
  });

  const { data: stats } = useQuery({
    queryKey: ['progress-stats'],
    queryFn: api.progress.stats,
  });

  const achieved = new Set(data?.milestones.map((m) => m.type) ?? []);

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
    const text = `I unlocked "${label}" on Word App! 🎓🦆`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Language Milestone', text });
        return;
      } catch { /* fall through */ }
    }
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard', 'success');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-[13px] text-text-secondary animate-pulse uppercase font-black tracking-widest">Collecting Rewards...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-up pb-8">
      <Header title="Milestones" showBack={true} />
      
      <div className="text-center pt-2">
        <LottieDuck type="celebrate" size={140} className="mx-auto" />
        <p className="text-[14px] text-text-secondary mt-1">
          {achieved.size} of {ALL_MILESTONES.length} achievements unlocked
        </p>
      </div>

      <div className="space-y-4">
        {ALL_MILESTONES.map((type, i) => {
          const isAchieved = achieved.has(type);
          const milestone = data?.milestones.find((m) => m.type === type);
          const progress = getProgress(type);
          const percent = progress ? Math.min(100, Math.round((progress.current / progress.target) * 100)) : 0;

          return (
            <div 
              key={type} 
              className={`course-card flex-col !items-stretch !p-6 relative overflow-hidden transition-all duration-500 ${
                !isAchieved ? 'opacity-60 grayscale-[0.5]' : 'shadow-lg shadow-accent/5'
              }`}
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {isAchieved && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full -mr-12 -mt-12 blur-2xl" />
              )}
              
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-line ${
                  isAchieved ? 'bg-white dark:bg-bg-subtle' : 'bg-bg-subtle/50'
                }`}>
                  {MILESTONE_ICONS[type] ?? '🏅'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-[17px] font-black uppercase tracking-tight ${
                    isAchieved ? 'text-text-primary' : 'text-text-secondary'
                  }`}>
                    {isAchieved ? MILESTONE_LABELS[type]?.replace(/[^\w\s-]/g, '').trim() : '???'}
                  </h3>
                  <p className="text-[12px] text-text-secondary font-medium italic">
                    {MILESTONE_HINTS[type]}
                  </p>
                </div>
              </div>

              {!isAchieved && progress ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-60">
                    <span>In Progress</span>
                    <span>{progress.current} / {progress.target}</span>
                  </div>
                  <div className="progress-bar h-1.5 opacity-40">
                    <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              ) : isAchieved ? (
                <div className="flex items-center justify-between pt-2 border-t border-line/30">
                  <span className="text-[11px] font-bold text-[#34a853] uppercase tracking-widest">
                    Unlocked {milestone && new Date(milestone.achievedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleShare(type)}
                    className="text-[11px] font-black text-accent uppercase tracking-widest px-4 py-2 bg-accent/5 rounded-xl hover:bg-accent/10 transition-colors"
                  >
                    Share link
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
