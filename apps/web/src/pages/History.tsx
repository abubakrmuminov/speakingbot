import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export default function History() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['sessions', page],
    queryFn: () => api.sessions.list(page, 20),
    placeholderData: (prev) => prev,
  });

  const scoreColor = (s: number) =>
    s >= 70 ? 'text-emerald-400' : s >= 50 ? 'text-amber-400' : 'text-red-400';

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const sessions = data?.sessions ?? [];
  const totalPages = data ? Math.ceil(data.total / 20) : 1;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Session History</h1>
        <button className="btn-primary" onClick={() => navigate('/session')}>
          + New Session
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">📋</div>
          <p className="text-slate-400">No sessions yet. Start practicing!</p>
          <button className="btn-primary mt-6" onClick={() => navigate('/session')}>
            Start First Session
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <button
              key={s.id}
              id={`session-${s.id}`}
              onClick={() => navigate(`/session/${s.id}`)}
              className="w-full card hover:border-brand-500/50 transition-all text-left"
            >
              <div className="flex items-center gap-4">
                <div className={`text-4xl font-extrabold w-16 text-center ${scoreColor(s.fluencyScore)}`}>
                  {s.fluencyScore}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{s.topic}</div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                    <span className="badge badge-blue">{s.scenario.replace('_', ' ')}</span>
                    <span>{s.errorCount} errors</span>
                    <span>{new Date(s.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <span className="text-slate-600 text-xl">›</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            className="btn-secondary px-4 py-2 text-sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            ← Prev
          </button>
          <span className="text-slate-400 text-sm">
            Page {page} / {totalPages}
          </span>
          <button
            className="btn-secondary px-4 py-2 text-sm"
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
