import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

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
    <div className="space-y-4 -mt-2">
      <div className="flex gap-6 border-b border-line">
        {(['speaking', 'reading'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`pb-2 text-[14px] capitalize transition-colors ${
              tab === t
                ? 'text-accent border-b-2 border-accent font-medium'
                : 'text-text-secondary'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {groups.size === 0 ? (
        <div className="text-center py-16">
          <p className="text-text-secondary text-[15px]">No sessions yet. Start practicing!</p>
          <button
            type="button"
            className="btn-primary mt-6 max-w-xs mx-auto"
            onClick={() => navigate(tab === 'speaking' ? '/session' : '/reading')}
          >
            Start {tab === 'speaking' ? 'Speaking' : 'Reading'}
          </button>
        </div>
      ) : (
        Array.from(groups.entries()).map(([label, items]) => (
          <div key={label}>
            <p className="section-label mb-1">{label}</p>
            <div className="divider mb-0" />
            {tab === 'speaking'
              ? (items as typeof speakingSessions).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => navigate(`/session/${s.id}`)}
                    className="list-item w-full text-left"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[15px] font-medium text-text-primary truncate pr-2">{s.topic}</span>
                      <div className="flex items-center gap-3 shrink-0">
                        {s.pronunciationScore !== null && (
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-text-secondary">Acc:</span>
                            <span className="font-serif text-[15px] text-brand-300 font-bold">{s.pronunciationScore}%</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <span className="font-serif text-lg text-accent">{s.fluencyScore}</span>
                          <span className="text-xs">🎙️</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-[12px] text-text-secondary mt-0.5">
                      {new Date(s.createdAt).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' })}
                      {' · '}{s.errorCount ?? 0} errors
                    </p>
                  </button>
                ))
              : (items as typeof readingSessions).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => navigate('/reading')}
                    className="list-item w-full text-left"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[15px] font-medium text-text-primary truncate pr-2">{s.topic}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-serif text-lg text-accent">{s.readingScore}</span>
                        <span>📖</span>
                      </div>
                    </div>
                    <p className="text-[12px] text-text-secondary mt-0.5">
                      {s.totalQuestions} questions · {s.correctAnswers} correct
                    </p>
                  </button>
                ))}
          </div>
        ))
      )}

      {tab === 'speaking' && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <button
            type="button"
            className="btn-ghost text-sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            ← Prev
          </button>
          <span className="text-[13px] text-text-secondary">{page} / {totalPages}</span>
          <button
            type="button"
            className="btn-ghost text-sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
