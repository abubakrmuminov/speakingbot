import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import Header from '../components/Header';
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
      className="px-2 py-1 rounded-lg transition-all hover:bg-bg-subtle active:scale-95"
    >
      <span className={`text-lg font-medium ${getWordColor(word.accuracyScore)}`}>{word.word}</span>
    </button>
  );
}

function PhonemeSheet({ word, onClose }: { word: PronunciationWord | null; onClose: () => void }) {
  if (!word) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 max-w-[480px] mx-auto">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className="relative w-full card-liquid rounded-t-2xl p-6 animate-fade-up">
        <div className="w-10 h-1 bg-line rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-serif text-2xl text-text-primary">{word.word}</h2>
            <p className="text-[13px] text-text-secondary">Accuracy: {word.accuracyScore}%</p>
          </div>
          <button type="button" onClick={onClose} className="btn-icon">×</button>
        </div>
        <p className="section-label mb-3">Phonemic breakdown</p>
        <div className="flex flex-wrap gap-3">
          {word.phonemes.map((p, i) => (
            <div key={i} className="flex flex-col items-center">
              <span className={`text-lg font-mono px-2 py-1 rounded-lg ${
                p.isCorrect ? 'bg-green-500/10 text-[#34a853]' : 'bg-red-500/10 text-[#d93025]'
              }`}>
                /{p.phoneme}/
              </span>
              <span className="text-[10px] text-text-secondary mt-1">{p.accuracyScore}%</span>
            </div>
          ))}
        </div>
        {word.errorType !== 'None' && (
          <div className="card-error mt-4">
            <span className="text-[#d93025] font-medium">Issue: </span>
            <span className="text-text-primary">{word.errorType}</span>
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
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session?.pronunciationData) {
    return (
      <div className="text-center py-20">
        <p className="text-text-secondary mb-4">No pronunciation data found.</p>
        <button type="button" className="btn-secondary max-w-xs mx-auto" onClick={() => navigate(-1)}>
          Go Back
        </button>
      </div>
    );
  }

  const { pronunciationData } = session;

  return (
    <div className="space-y-4 -mt-2">
      <Header title="Pronunciation" showBack onBack={() => navigate(-1)} />

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Accuracy', score: pronunciationData.accuracyScore },
          { label: 'Fluency', score: pronunciationData.fluencyScore },
          { label: 'Complete', score: pronunciationData.completenessScore },
        ].map((s) => (
          <div key={s.label} className="card text-center py-3">
            <p className="section-label mb-1">{s.label}</p>
            <p className="font-serif text-3xl text-accent">{s.score}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <p className="section-label mb-3">Detailed transcript</p>
        <div className="flex flex-wrap gap-x-2 gap-y-1 leading-relaxed">
          {pronunciationData.words.map((w, i) => (
            <WordItem key={i} word={w} onClick={() => setSelectedWord(w)} />
          ))}
        </div>
        <p className="text-[11px] text-text-secondary mt-4 italic">
          Tap a word to see phonemic breakdown
        </p>
      </div>

      <div className="card-tip">
        <p className="font-medium text-text-primary mb-2">AI Summary</p>
        <p className="text-[15px] text-text-secondary leading-relaxed">
          {pronunciationData.pronunciationScore >= 80
            ? 'Exceptional clarity. Your speech sounds natural with minimal phoneme deviations.'
            : pronunciationData.pronunciationScore >= 60
            ? 'Good pronunciation. Focus on words marked in red to improve accuracy.'
            : 'Keep practicing. Review phonemic breakdown for low-accuracy words.'}
        </p>
      </div>

      <PhonemeSheet word={selectedWord} onClose={() => setSelectedWord(null)} />
    </div>
  );
}
