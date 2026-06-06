import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useSpeech } from '../hooks/useSpeech';
import Header from '../components/Header';
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
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="text-center py-20">
        <p className="text-[#d93025] mb-4">Session not found.</p>
        <button type="button" className="btn-secondary max-w-xs mx-auto" onClick={() => navigate('/history')}>
          Back to History
        </button>
      </div>
    );
  }

  const errors = session.errorAnalysis as ErrorItem[];
  const date = new Date(session.createdAt);

  return (
    <div className="space-y-0 -mt-2">
      <Header title={session.topic} showBack onBack={() => navigate('/history')} />

      <p className="text-[13px] text-text-secondary py-2">
        {date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
        {' · '}
        {date.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' })}
      </p>

      <div className="divider" />

      <div className="py-4 text-center">
        <p className="section-label mb-2">Fluency Score</p>
        <span className="font-serif text-5xl text-accent">{session.fluencyScore}</span>
      </div>

      <div className="divider" />

      {session.transcript && (
        <>
          <div className="py-4">
            <p className="section-label mb-3">What you said</p>
            <p className="text-[15px] italic text-text-secondary leading-relaxed bg-bg-subtle rounded-xl p-4">
              "{session.transcript}"
            </p>
          </div>
          <div className="divider" />
        </>
      )}

      <div className="py-4">
        <p className="section-label mb-3">Mistakes</p>
        {errors.length > 0 ? (
          <div className="space-y-3">
            {errors.map((item, i) => (
              <div key={i} className="card-error">
                <p className="text-[15px] text-text-primary">
                  ❌ {item.original} → <span className="text-[#34a853]">{item.corrected}</span>
                </p>
                <p className="text-[13px] text-text-secondary mt-2">💡 {item.explanation}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[15px] text-[#34a853]">No significant errors — great work!</p>
        )}
      </div>

      <div className="card-accent mt-4">
        <p className="section-label mb-2">AI said:</p>
        <p className="text-[15px] text-text-primary leading-relaxed italic">"{session.dialogueReply}"</p>
        <button
          type="button"
          onClick={() => speak(session.dialogueReply)}
          className="btn-ghost text-[13px] mt-2"
        >
          🔊 Listen
        </button>
      </div>

      <div className="card-tip mt-4">
        <p className="font-medium text-text-primary mb-1">Pro tip</p>
        <p className="text-[15px] text-text-secondary leading-relaxed">{session.grammarTip}</p>
      </div>

      {session.pronunciationScore !== null && (
        <button
          type="button"
          className="btn-secondary mt-4"
          onClick={() => navigate(`/session/${session.id}/pronunciation`)}
        >
          Pronunciation Analysis →
        </button>
      )}
    </div>
  );
}
