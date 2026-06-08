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
    <div className="space-y-6 animate-fade-up pb-8 pt-2">
      <div className="flex items-center justify-between px-1">
        <button 
          onClick={() => navigate('/history')}
          className="w-10 h-10 rounded-full border border-line flex items-center justify-center text-text-secondary hover:text-accent transition-colors"
        >
          ←
        </button>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-60">Session Recorded</p>
          <p className="text-[12px] font-bold text-text-primary">
            {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} • {date.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' })}
          </p>
        </div>
      </div>

      <div className="card-liquid text-center py-10 relative overflow-hidden">
         <div className="font-serif text-[84px] text-accent font-black tracking-tighter leading-none mb-1">
           {session.fluencyScore}
         </div>
         <p className="text-[14px] font-bold uppercase tracking-widest text-text-secondary">Fluency Score</p>
         <h2 className="mt-4 text-xl font-bold text-text-primary uppercase tracking-tight opacity-90">{session.topic}</h2>
      </div>

      {session.transcript && (
        <div className="space-y-3">
          <p className="text-[12px] font-black uppercase tracking-widest text-text-secondary px-1">Your Performance</p>
          <div className="bg-surface/50 border border-line rounded-[32px] p-6 relative">
            <span className="absolute top-4 left-4 text-4xl text-accent/10 font-serif">“</span>
            <p className="font-serif text-lg text-text-primary leading-relaxed italic relative z-10 px-2">
              {session.transcript}
            </p>
            <span className="absolute bottom-4 right-4 text-4xl text-accent/10 font-serif rotate-180">“</span>
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="space-y-3">
          <p className="text-[12px] font-black uppercase tracking-widest text-text-secondary px-1">Critical Corrections</p>
          <div className="space-y-3">
            {errors.map((item, i) => (
              <div key={i} className="card border-l-4 border-l-[#d93025] !p-5 shadow-sm">
                <div className="flex items-start gap-3 mb-2">
                  <span className="text-lg mt-0.5">❌</span>
                  <div className="flex-1">
                    <p className="text-[14px] font-bold text-text-primary line-through opacity-50 decoration-2">{item.original}</p>
                    <p className="text-[16px] font-black text-[#34a853] mt-1">{item.corrected}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-line/30 flex gap-2">
                   <span className="text-sm opacity-60">💡</span>
                   <p className="text-[13px] text-text-secondary leading-relaxed font-medium italic">{item.explanation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card-success !p-6">
        <div className="flex items-center justify-between mb-4">
           <p className="text-[12px] font-black uppercase tracking-widest text-text-primary">AI Feedback</p>
           <button
            type="button"
            onClick={() => speak(session.dialogueReply)}
            className="w-10 h-10 rounded-full bg-white/50 flex items-center justify-center text-lg active:scale-95 shadow-sm"
          >
            🔊
          </button>
        </div>
        <p className="text-[15px] text-text-primary leading-relaxed italic mb-4 font-serif">"{session.dialogueReply}"</p>
        <div className="pt-4 border-t border-black/5 opacity-80">
           <p className="text-[11px] font-black uppercase tracking-tighter text-text-primary mb-1">Grammar Tip</p>
           <p className="text-[13px] font-medium leading-relaxed">{session.grammarTip}</p>
        </div>
      </div>

      {session.pronunciationScore !== null && (
        <button
          type="button"
          className="btn-primary !py-5 shadow-xl shadow-accent/20"
          onClick={() => navigate(`/session/${session.id}/pronunciation`)}
        >
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl">🔍</span>
            <div className="text-left">
              <div className="text-[11px] font-black uppercase tracking-widest opacity-70 leading-none mb-1">Deep Analysis</div>
              <div className="text-[16px] font-black">Phonics Detail: {session.pronunciationScore}%</div>
            </div>
            <span className="ml-auto text-2xl font-serif">›</span>
          </div>
        </button>
      )}
    </div>
  );
}
