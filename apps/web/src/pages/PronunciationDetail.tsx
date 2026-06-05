import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { PronunciationWord, Session } from '@speaking-coach/shared';

// ─── Score Card ───────────────────────────────────────────────────────────
function ScoreCard({ label, score, colorClass }: { label: string; score: number; colorClass: string }) {
  return (
    <div className="card text-center flex-1 min-w-[120px]">
      <div className="text-slate-400 text-xs mb-1 uppercase tracking-wider">{label}</div>
      <div className={`text-4xl font-bold font-serif ${colorClass}`}>{score}</div>
    </div>
  );
}

// ─── Word Item ─────────────────────────────────────────────────────────────
function WordItem({ word, onClick }: { word: PronunciationWord; onClick: () => void }) {
  const getWordColor = (score: number) => {
    if (score >= 95) return 'text-emerald-400'; // Почти идеально
    if (score >= 85) return 'text-brand-300';   // Хорошо
    if (score >= 70) return 'text-amber-400';   // Есть неточности
    return 'text-red-400';                      // Ошибка
  };

  return (
    <button
      onClick={onClick}
      className="group relative px-2 py-1 rounded-lg transition-all hover:bg-surface-elevated active:scale-95"
    >
      <span className={`text-xl font-medium ${getWordColor(word.accuracyScore)}`}>
        {word.word}
      </span>
      {word.errorType !== 'None' && (
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-surface" />
      )}
    </button>
  );
}

// ─── Phoneme Detail Sheet ──────────────────────────────────────────────────
function PhonemeSheet({ word, onClose }: { word: PronunciationWord | null; onClose: () => void }) {
  if (!word) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-surface-card rounded-t-3xl sm:rounded-3xl border border-surface-border p-8 shadow-2xl animate-fade-up">
        {/* Handle for mobile drag-look */}
        <div className="w-12 h-1.5 bg-surface-border rounded-full mx-auto mb-6 sm:hidden" />
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold font-serif">{word.word}</h2>
            <p className="text-slate-400">Word Accuracy: {word.accuracyScore}%</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-elevated rounded-full">✕</button>
        </div>

        <div className="space-y-6">
          <div>
            <div className="text-sm font-semibold text-slate-500 mb-3 uppercase">Phonemic Breakdown</div>
            <div className="flex flex-wrap gap-4">
              {word.phonemes.map((p, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className={`text-2xl font-mono px-3 py-1 rounded-xl mb-1 ${p.isCorrect ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-500'}`}>
                    /{p.phoneme}/
                  </div>
                  <span className="text-[10px] text-slate-500">{p.accuracyScore}%</span>
                </div>
              ))}
            </div>
          </div>

          {word.syllables && word.syllables.length > 0 && (
            <div>
              <div className="text-sm font-semibold text-slate-500 mb-2 uppercase">Syllables</div>
              <div className="flex gap-2">
                {word.syllables.map((s, i) => (
                  <span key={i} className="px-3 py-1 bg-surface-elevated rounded-lg text-sm">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {word.errorType !== 'None' && (
            <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl">
              <span className="text-red-400 font-bold">Issue detected: </span>
              <span className="text-slate-300">{word.errorType}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function PronunciationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedWord, setSelectedWord] = useState<PronunciationWord | null>(null);

  const { data: session, isLoading } = useQuery<Session>({
    queryKey: ['session', id],
    queryFn: () => api.sessions.get(id!),
    enabled: !!id,
  });

  if (isLoading) return <div className="py-20 text-center text-slate-500">Loading details...</div>;
  if (!session || !session.pronunciationData) {
    return (
      <div className="py-20 text-center">
        <p className="text-slate-400 mb-4">No pronunciation data found for this session.</p>
        <button className="btn-secondary" onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  const { pronunciationData } = session;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-8 pb-32">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-serif gradient-text">Pronunciation Analysis</h1>
        <button className="btn-ghost" onClick={() => navigate(-1)}>Close</button>
      </div>

      {/* Hero Scores */}
      <div className="flex flex-wrap gap-4 animate-fade-up">
        <ScoreCard label="Accuracy" score={pronunciationData.accuracyScore} colorClass="text-brand-300" />
        <ScoreCard label="Fluency" score={pronunciationData.fluencyScore} colorClass="text-emerald-400" />
        <ScoreCard label="Completeness" score={pronunciationData.completenessScore} colorClass="text-amber-400" />
      </div>

      {/* Transcript with word highlighting */}
      <div className="card animate-fade-up delay-100">
        <h2 className="text-sm font-semibold text-slate-500 mb-4 uppercase tracking-wider">Detailed Transcript</h2>
        <div className="flex flex-wrap gap-x-3 gap-y-2 leading-relaxed">
          {pronunciationData.words.map((w, i) => (
            <WordItem key={i} word={w} onClick={() => setSelectedWord(w)} />
          ))}
        </div>
        <p className="mt-8 text-xs text-slate-500 italic">
          Tip: Click on any word to see its phonemic breakdown and specific errors.
        </p>
      </div>

      {/* Summary / Conclusion */}
      <div className="card animate-fade-up delay-200 border-brand-500/20">
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <span>🧠</span> AI Summary
        </h2>
        <p className="text-slate-300 leading-relaxed">
          {pronunciationData.overallScore >= 80 
            ? "Exceptional clarity. Your speech sounds natural and well-structured with minimal phoneme deviations."
            : pronunciationData.overallScore >= 60
            ? "Good pronunciation. Focus on the words marked in red to improve specific phoneme accuracy."
            : "Keep practicing. Pay attention to the phonemic breakdown in the words where accuracy was low."}
        </p>
      </div>

      {/* Phoneme Sheet overlay */}
      <PhonemeSheet word={selectedWord} onClose={() => setSelectedWord(null)} />
    </div>
  );
}
