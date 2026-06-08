import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import LottieDuck from '../components/LottieDuck';

type Tab = 'speaking' | 'reading';

function groupByDate(items: { createdAt: string }[]): Map<string, typeof items> {
  const groups = new Map<string, typeof items>();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  for (const item of items) {
    const dateKey = item.createdAt.slice(0, 10);
    let label: string;
    if (dateKey === today) label = 'Today';
    else if (dateKey === yesterday) label = 'Yesterday';
    else label = new Date(dateKey).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    const existing = groups.get(label) ?? [];
    existing.push(item);
    groups.set(label, existing);
  }
  return groups;
}

export default function History() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('speaking');
  const [page, setPage] = useState(1);

  const { data: speakingData, isLoading: speakingLoading } = useQuery({
    queryKey: ['sessions', page],
    queryFn: () => api.sessions.list(page, 20),
    placeholderData: (prev) => prev,
    enabled: tab === 'speaking',
  });

  const { data: readingData, isLoading: readingLoading } = useQuery({
    queryKey: ['reading-history'],
    queryFn: api.reading.history,
    enabled: tab === 'reading',
  });

  const isLoading = tab === 'speaking' ? speakingLoading : readingLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const speakingSessions = speakingData?.sessions ?? [];
  const readingSessions = readingData ?? [];
  const groups = tab === 'speaking'
    ? groupByDate(speakingSessions)
    : groupByDate(readingSessions);

  const totalPages = speakingData ? Math.ceil(speakingData.total / 20) : 1;

  return (
    <div className="space-y-6 animate-fade-up pb-8">
      {/* Header with Hero */}
      <div className="text-center pt-4">
        <LottieDuck type="search" size={120} className="mb-2 mx-auto" />
        <h1 className="font-serif text-2xl text-text-primary tracking-tight">Activity Log</h1>
        <p className="text-[13px] text-text-secondary mt-1">Review your past sessions and progress.</p>
      </div>

      {/* Modern Tabs */}
      <div className="flex p-1 bg-surface/50 border border-line rounded-2xl">
        {(['speaking', 'reading'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { setTab(t); setPage(1); }}
            className={`flex-1 py-2.5 text-[12px] font-black uppercase tracking-widest rounded-xl transition-all ${
              tab === t
                ? 'bg-white dark:bg-bg-subtle text-accent shadow-sm ring-1 ring-line'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {groups.size === 0 ? (
        <div className="text-center py-16 card-liquid">
          <p className="text-text-secondary text-[14px]">Your journey is just beginning.</p>
          <button
            type="button"
            className="btn-primary mt-6 px-8 py-3"
            onClick={() => navigate(tab === 'speaking' ? '/session' : '/reading')}
          >
            Start First Practice
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(groups.entries()).map(([label, items], gIdx) => (
            <div key={label} className="space-y-3">
              <p className="text-[11px] font-black uppercase tracking-widest text-text-secondary px-1 opacity-70">
                {label}
              </p>
              <div className="space-y-3">
                {tab === 'speaking'
                  ? (items as typeof speakingSessions).map((s, i) => (
                      <div 
                        key={s.id} 
                        className="course-card cursor-pointer"
                        onClick={() => navigate(`/session/${s.id}`)}
                        style={{ animationDelay: `${i * 50}ms` }}
                      >
                        <div className="w-12 h-12 rounded-full border-2 border-line flex-shrink-0 flex items-center justify-center bg-bg-subtle text-xl">
                          🎙️
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[15px] font-bold text-text-primary truncate uppercase tracking-tight">
                            {s.topic}
                          </h4>
                          <p className="text-[12px] text-text-secondary">
                            {new Date(s.createdAt).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' })}
                            {' · '}{s.errorCount ?? 0} errors
                          </p>
                        </div>
                        <div className="text-right flex flex-col items-end">
                           <div className="flex items-center gap-1">
                              <span className="font-serif text-xl text-accent font-black">{s.fluencyScore}</span>
                              <span className="text-[10px] font-bold text-text-secondary uppercase">pt</span>
                           </div>
                           {s.pronunciationScore !== null && (
                             <p className="text-[10px] font-black text-[#34a853] uppercase tracking-tighter">
                               {s.pronunciationScore}% acc
                             </p>
                           )}
                        </div>
                      </div>
                    ))
                  : (items as typeof readingSessions).map((s, i) => (
                      <div 
                        key={s.id} 
                        className="course-card cursor-pointer"
                        onClick={() => navigate('/reading')}
                        style={{ animationDelay: `${i * 50}ms` }}
                      >
                        <div className="w-12 h-12 rounded-full border-2 border-line flex-shrink-0 flex items-center justify-center bg-bg-subtle text-xl">
                          📖
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[15px] font-bold text-text-primary truncate uppercase tracking-tight">
                            {s.topic}
                          </h4>
                          <p className="text-[12px] text-text-secondary">
                            {s.totalQuestions} questions · {s.correctAnswers} correct
                          </p>
                        </div>
                        <div className="text-right">
                           <div className="flex items-center gap-1">
                              <span className="font-serif text-xl text-accent font-black">{s.readingScore}</span>
                              <span className="text-[10px] font-bold text-text-secondary uppercase">pt</span>
                           </div>
                           <p className="text-[10px] font-black text-text-secondary uppercase tracking-tighter">
                             Dictionary
                           </p>
                        </div>
                      </div>
                    ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'speaking' && totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-6">
          <button
            type="button"
            className="w-10 h-10 rounded-full border border-line flex items-center justify-center text-accent disabled:opacity-30"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            ←
          </button>
          <span className="text-[13px] font-black tracking-widest text-text-secondary">{page} / {totalPages}</span>
          <button
            type="button"
            className="w-10 h-10 rounded-full border border-line flex items-center justify-center text-accent disabled:opacity-30"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
