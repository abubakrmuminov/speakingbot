import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import LottieDuck from '../components/LottieDuck';
import type { PronunciationWord, Session } from '@speaking-coach/shared';

function WordItem({ word, onClick }: { word: PronunciationWord; onClick: () => void }) {
  const getWordColor = (score: number) => {
    if (score >= 95) return 'text-[#34a853]';
    if (score >= 85) return 'text-accent';
    if (score >= 70) return 'text-[#f9ab00]';
    return 'text-[#d93025]';
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-xl transition-all hover:bg-white/40 active:scale-95 border border-transparent hover:border-line hover:shadow-sm ${getWordColor(word.accuracyScore)}`}
    >
      <span className="text-lg font-bold tracking-tight">{word.word}</span>
    </button>
  );
}

function PhonemeSheet({ word, onClose }: { word: PronunciationWord | null; onClose: () => void }) {
  if (!word) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-4 max-w-[480px] mx-auto">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} aria-hidden />
      <div className="relative w-full bg-white dark:bg-bg-subtle rounded-[32px] p-8 animate-slide-up shadow-2xl border border-line">
        <div className="w-12 h-1.5 bg-line rounded-full mx-auto mb-8 opacity-50" />
        
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-serif text-3xl text-text-primary tracking-tight font-black">{word.word}</h2>
            <div className="flex items-center gap-2 mt-1">
               <span className="text-[12px] font-black uppercase tracking-widest text-text-secondary">Accuracy Score</span>
               <span className="text-[14px] font-bold text-accent">{word.accuracyScore}%</span>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="w-10 h-10 rounded-full bg-bg-subtle border border-line flex items-center justify-center text-xl text-text-secondary"
          >
            ×
          </button>
        </div>

        <p className="text-[11px] font-black uppercase tracking-widest text-text-secondary mb-4 px-1">Phonemic breakdown</p>
        <div className="flex flex-wrap gap-4 mb-8">
          {word.phonemes.map((p, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-mono font-bold shadow-inner border-2 ${
                p.isCorrect 
                  ? 'bg-[#34a853]/10 text-[#34a853] border-[#34a853]/20' 
                  : 'bg-[#d93025]/10 text-[#d93025] border-[#d93025]/20'
              }`}>
                /{p.phoneme}/
              </div>
              <span className="text-[11px] font-black text-text-secondary opacity-60">{p.accuracyScore}%</span>
            </div>
          ))}
        </div>

        {word.errorType !== 'None' && (
          <div className="card-error !p-5 !rounded-2xl flex items-start gap-3">
            <span className="text-xl">💡</span>
            <div>
              <p className="text-[12px] font-black uppercase tracking-widest text-[#d93025] mb-1">Articulation Issue</p>
              <p className="text-[14px] font-medium text-text-primary italic leading-relaxed">
                Detected {word.errorType.toLowerCase()} attempt in this word.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PronunciationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedWord, setSelectedWord] = useState<PronunciationWord | null>(null);

  const { data: session, isLoading } = useQuery<Session>({
    queryKey: ['session', id],
    queryFn: () => api.sessions.get(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 animate-fade-up">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-[13px] text-text-secondary font-black uppercase tracking-widest animate-pulse">Analyzing Phonics...</p>
      </div>
    );
  }

  if (!session?.pronunciationData) {
    return (
      <div className="text-center py-20 px-6 animate-fade-up">
        <LottieDuck type="thinking" size={160} className="mx-auto mb-4" />
        <p className="text-text-secondary mb-6 font-medium italic">We couldn't extract detailed phonics for this session.</p>
        <button type="button" className="btn-secondary w-full max-w-xs mx-auto" onClick={() => navigate(-1)}>
          Return to Summary
        </button>
      </div>
    );
  }

  const { pronunciationData } = session;

  return (
    <div className="space-y-6 animate-fade-up pb-10 pt-2">
      <div className="flex items-center gap-4 px-1">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full border border-line flex items-center justify-center text-text-secondary hover:text-accent transition-colors"
        >
          ←
        </button>
        <h1 className="font-serif text-2xl text-text-primary tracking-tight font-black">Phonics Detail</h1>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Accuracy', score: pronunciationData.accuracyScore, icon: '🎯' },
          { label: 'Fluency', score: pronunciationData.fluencyScore, icon: '🎙' },
          { label: 'Completeness', score: pronunciationData.completenessScore, icon: '📊' },
        ].map((s) => (
          <div key={s.label} className="card-liquid text-center py-4 px-2">
            <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary mb-1 opacity-70 leading-none">{s.label}</p>
            <p className="font-serif text-[28px] text-accent font-black tracking-tighter leading-none mb-1">{s.score}</p>
            <span className="text-[12px] opacity-40">{s.icon}</span>
          </div>
        ))}
      </div>

      <div className="card shadow-sm !p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-[12px] font-black uppercase tracking-widest text-text-secondary">Word Breakdown</p>
          <span className="text-[11px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full italic">Tap words</span>
        </div>
        <div className="flex flex-wrap gap-x-1 gap-y-2 leading-relaxed justify-center">
          {pronunciationData.words.map((w, i) => (
            <WordItem key={i} word={w} onClick={() => setSelectedWord(w)} />
          ))}
        </div>
      </div>

      <div className="card-success border border-[#34a853]/10 !p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
           <LottieDuck type="study" size={100} />
        </div>
        <p className="text-[12px] font-black uppercase tracking-widest text-text-primary mb-3">AI Deep Summary</p>
        <p className="text-[15px] text-text-primary leading-relaxed italic font-serif relative z-10">
          {pronunciationData.pronunciationScore >= 80
            ? 'Exceptional clarity. Your speech sounds natural with minimal phoneme deviations. Keep this level!'
            : pronunciationData.pronunciationScore >= 60
            ? 'Solid pronunciation overall. Focus on the words highlighted in amber/red to reach native level.'
            : 'Consider practicing specific phonemes marked in red. Slow down and focus on clear articulation.'}
        </p>
      </div>

      <PhonemeSheet word={selectedWord} onClose={() => setSelectedWord(null)} />
    </div>
  );
}
