import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import LottieDuck from '../components/LottieDuck';

export default function Dashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['progress-stats'],
    queryFn: api.progress.stats,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const streak = stats?.streak;
  const currentStreak = streak?.currentStreak ?? 0;
  const todayDone = streak?.lastActiveDate === new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6 pb-4">
      {/* Hero Section */}
      <div className="text-center pt-4 animate-fade-up">
        <LottieDuck type="study" size={160} className="mb-2" />
        <h1 className="font-serif text-3xl text-text-primary tracking-tight">
          Grow with Word
        </h1>
        <p className="text-[14px] text-text-secondary mt-1">
          Learn new words daily. Build strong habits.
        </p>
      </div>

      {/* Streak Banner */}
      <div 
        className="streak-card-gradient rounded-[24px] p-6 text-white cursor-pointer transition-transform active:scale-[0.98]"
        onClick={() => navigate('/progress')}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-1">
            <p className="text-[13px] font-medium opacity-90 uppercase tracking-wider">Daily Goal</p>
            <h3 className="text-xl font-bold">
              {todayDone ? 'Goal completed!' : 'Start your learning Streak'}
            </h3>
          </div>
          <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-2xl shadow-inner border border-white/10">
            🔥
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between text-[11px] font-black uppercase tracking-widest opacity-80">
            <span>{currentStreak} Day Streak</span>
            <span className="text-white font-black underline underline-offset-4">View History</span>
          </div>
          <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-1000 shadow-[0_0_15px_rgba(255,255,255,0.6)]" 
              style={{ width: todayDone ? '100%' : '60%' }} 
            />
          </div>
        </div>
      </div>

      {/* Activity List */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-[11px] font-black uppercase tracking-widest text-text-secondary opacity-60">Your Courses</p>
          <button onClick={() => navigate('/history')} className="text-[11px] font-black text-accent uppercase tracking-widest px-2">
            View All
          </button>
        </div>

        <div className="space-y-3">
          <div className="course-card" onClick={() => navigate('/session')}>
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-line flex-shrink-0 flex items-center justify-center bg-bg-subtle text-xl">
              🇬🇧
            </div>
            <div className="flex-1">
              <h4 className="text-[15px] font-bold text-text-primary">SPEAKING PRACTICE</h4>
              <p className="text-[12px] text-text-secondary">EN · intermediate</p>
            </div>
            <div className="text-right">
              <p className="text-[13px] font-bold text-text-primary">8 levels</p>
              <p className="text-[11px] text-text-secondary">{stats?.totalSessions ?? 0} sessions</p>
            </div>
          </div>

          <div className="course-card" onClick={() => navigate('/reading')}>
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-line flex-shrink-0 flex items-center justify-center bg-bg-subtle text-xl">
              📖
            </div>
            <div className="flex-1">
              <h4 className="text-[15px] font-bold text-text-primary">ACADEMIC READING</h4>
              <p className="text-[12px] text-text-secondary">EN · B2 / C1</p>
            </div>
            <div className="text-right">
              <p className="text-[13px] font-bold text-text-primary">12 levels</p>
              <p className="text-[11px] text-text-secondary">Reading stats</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
