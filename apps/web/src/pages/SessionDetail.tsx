import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useSpeech } from '../hooks/useSpeech';
import type { ErrorItem } from '@speaking-coach/shared';

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { speak } = useSpeech();

  const { data: session, isLoading, error } = useQuery({
    queryKey: ['session', id],
    queryFn: () => api.sessions.get(id!),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 mb-4">Session not found.</p>
        <button className="btn-secondary" onClick={() => navigate('/history')}>Back to History</button>
      </div>
    );
  }

  const errors = session.errorAnalysis as ErrorItem[];
  const scoreColor = session.fluencyScore >= 70 ? 'text-emerald-400' : session.fluencyScore >= 50 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 md:pb-0">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/history')} className="btn-ghost text-sm">← Back</button>
        <div>
          <h1 className="text-xl font-bold">{session.topic}</h1>
          <p className="text-slate-400 text-sm">
            {session.scenario.replace('_', ' ')} · {new Date(session.createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Score */}
      <div className="card text-center">
        <div className={`text-7xl font-extrabold ${scoreColor}`}>{session.fluencyScore}</div>
        <div className="text-slate-400 text-sm mt-1">Fluency Score</div>
        <div className="flex justify-center gap-6 mt-4 text-sm text-slate-400">
          {session.wordsPerMinute && <span>🗣 {session.wordsPerMinute} WPM</span>}
          {session.pauseCount !== null && <span>⏸ {session.pauseCount} pauses</span>}
          <span>❌ {session.errorCount} errors</span>
          <span>🎯 Confidence: {session.confidenceLevel}/5</span>
        </div>
      </div>

      {/* Transcript */}
      {session.transcript && (
        <div className="card">
          <h2 className="font-semibold mb-3">📝 Your Transcript</h2>
          <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{session.transcript}</p>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 ? (
        <div className="card">
          <h2 className="font-semibold mb-4">Corrections</h2>
          <div className="space-y-4">
            {errors.map((item, i) => (
              <div key={i} className="border-l-2 border-red-500/40 pl-4">
                <div className="text-red-400 line-through text-sm">{item.original}</div>
                <div className="text-emerald-400 font-semibold text-sm mt-1">✅ {item.corrected}</div>
                <div className="text-slate-400 text-xs mt-1">{item.explanation}</div>
                <span className={`badge text-xs mt-2 inline-block ${item.category === 'grammar' ? 'badge-blue' : item.category === 'vocabulary' ? 'badge-amber' : 'badge-red'}`}>
                  {item.category}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card text-center py-6">
          <div className="text-3xl mb-2">🎯</div>
          <p className="text-emerald-400 font-semibold">No significant errors — great work!</p>
        </div>
      )}

      {/* AI Reply */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">🤖 AI Coach Reply</h2>
          <button onClick={() => speak(session.dialogueReply)} className="btn-ghost text-xs">🔊 Listen</button>
        </div>
        <p className="text-slate-300 leading-relaxed">{session.dialogueReply}</p>
      </div>

      {/* Grammar Tip */}
      <div className="card border-brand-500/30 bg-brand-500/5">
        <h2 className="font-semibold mb-2 text-brand-300">💡 Grammar Tip</h2>
        <p className="text-slate-300 text-sm leading-relaxed">{session.grammarTip}</p>
      </div>

      {/* Topic Feedback */}
      {session.topicFeedback && (
        <div className="card bg-surface-elevated">
          <h2 className="font-semibold mb-2 text-slate-300">Topic Feedback</h2>
          <p className="text-slate-400 text-sm italic">"{session.topicFeedback}"</p>
        </div>
      )}
    </div>
  );
}
