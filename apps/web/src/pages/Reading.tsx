import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { usePageMeta } from '../hooks/usePageMeta';
import Header from '../components/Header';
import LottieDuck from '../components/LottieDuck';
import type { ReadingResult } from '@speaking-coach/shared';

type State = 'intro' | 'loading' | 'reading' | 'results';

export default function Reading() {
  const navigate = useNavigate();
  const [state, setState] = useState<State>('intro');
  const [difficulty, setDifficulty] = useState<'B2' | 'C1'>('B2');
  const [session, setSession] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<ReadingResult | null>(null);
  const [openAccordion, setOpenAccordion] = useState<Record<string, boolean>>({});

  usePageMeta({
    title: 'Reading',
    hideHeader: state === 'results',
  });

  const generateMutation = useMutation({
    mutationFn: (diff: 'B2' | 'C1') => api.reading.generate(diff),
    onSuccess: (data) => {
      setSession(data);
      setState('reading');
    },
  });

  const submitMutation = useMutation({
    mutationFn: (data: { sessionId: string; answers: { questionId: string; answer: string }[] }) =>
      api.reading.submit(data.sessionId, data.answers),
    onSuccess: (data) => {
      setResults(data);
      setState('results');
    },
  });

  const handleStart = () => {
    setState('loading');
    generateMutation.mutate(difficulty);
  };

  const handleSubmit = () => {
    if (!session) return;
    const formattedAnswers = Object.entries(answers).map(([questionId, answer]) => ({
      questionId,
      answer,
    }));
    submitMutation.mutate({ sessionId: session.sessionId, answers: formattedAnswers });
  };

  const totalQuestions = session?.questions?.length ?? 8;
  const answeredCount = (session?.questions ?? []).filter(
    (q: any) => (answers[q.id]?.trim()?.length ?? 0) > 0,
  ).length;
  const isAllAnswered = answeredCount === totalQuestions;

  const getQuestionTypeLabel = (q: any) => {
    if (q.type === 'true_false_ng') return 'True / False / NG';
    if (q.type === 'open') return 'Open question';
    return 'Multiple choice';
  };

  if (state === 'intro') {
    return (
      <div className="space-y-8 animate-fade-up">
        {/* Hero Section */}
        <div className="text-center pt-4">
          <LottieDuck type="hello" size={160} className="mb-2" />
          <h2 className="font-serif text-3xl text-text-primary tracking-tight">Academic Dictionary</h2>
          <p className="text-[14px] text-text-secondary mt-1 max-w-[280px] mx-auto leading-relaxed">
            IELTS · TOEFL level texts to expand your advanced vocabulary.
          </p>
        </div>

        {/* Feature List */}
        <div className="grid grid-cols-1 gap-3">
          {[
            { icon: '🎯', title: '8 Target Questions', desc: 'Precise automated grading' },
            { icon: '📂', title: 'Contextual Patterns', desc: 'AI analyzes your weak spots' },
            { icon: '⚡', title: 'Instant Feedback', desc: 'Detailed Russian explanations' }
          ].map((f) => (
            <div key={f.title} className="flex items-center gap-4 p-4 rounded-2xl bg-bg-subtle border border-line">
              <span className="text-2xl">{f.icon}</span>
              <div>
                <p className="text-[13px] font-bold text-text-primary uppercase tracking-wider">{f.title}</p>
                <p className="text-[12px] text-text-secondary">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Difficulty Selection */}
        <div className="space-y-4">
          <p className="text-[12px] font-bold uppercase tracking-widest text-text-secondary px-1">Select Proficiency</p>
          <div className="grid grid-cols-2 gap-3">
            {(['B2', 'C1'] as const).map((d) => (
              <div 
                key={d}
                onClick={() => setDifficulty(d)}
                className={`course-card flex-col items-start !gap-1 cursor-pointer transition-all ${
                  difficulty === d ? 'border-accent ring-1 ring-accent bg-accent/5' : ''
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xl">{d === 'B2' ? '🇬🇧' : '🇺🇸'}</span>
                  <div className={`w-3 h-3 rounded-full border-2 ${difficulty === d ? 'border-accent bg-accent' : 'border-line'}`} />
                </div>
                <p className="text-[15px] font-bold text-text-primary uppercase">{d} Upper</p>
                <p className="text-[12px] text-text-secondary">{d === 'B2' ? 'Intermediate' : 'Advanced'}</p>
              </div>
            ))}
          </div>
        </div>

        <button type="button" onClick={handleStart} className="btn-primary py-4 shadow-lg shadow-accent/20">
          Generate Study Passage
        </button>
      </div>
    );
  }

  if (state === 'loading') {
    return (
      <div className="space-y-8 animate-fade-up">
        {generateMutation.isError ? (
          <div className="text-center py-10">
            <span className="text-4xl">⚠️</span>
            <h3 className="text-lg font-medium text-text-primary mt-4">AI is busy</h3>
            <p className="text-[14px] text-text-secondary mt-2 leading-relaxed">
              Google Gemini is currently experiencing high demand. Please wait a moment and try again.
            </p>
            <div className="flex gap-2 mt-8">
              <button type="button" onClick={handleStart} className="btn-primary flex-1">
                Retry Now
              </button>
              <button type="button" onClick={() => setState('intro')} className="btn-secondary flex-1">
                Back
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-10">
            <LottieDuck type="thinking" size={200} className="mb-6" />
            <div className="space-y-2 max-w-xs mx-auto">
              <div className="skeleton h-2 w-full" />
              <div className="skeleton h-2 w-3/4 mx-auto" />
            </div>
            <p className="text-[14px] font-medium text-text-primary mt-8">Generating your passage...</p>
            <p className="text-[12px] text-text-secondary mt-1">This takes about 10-15 seconds</p>
          </div>
        )}
      </div>
    );
  }

  if (state === 'reading' && session) {
    return (
      <div className="space-y-6 animate-fade-up">
        {/* Header Info */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">📖</span>
            <h3 className="font-bold text-text-primary uppercase tracking-tight truncate max-w-[200px]">
              {session.topic}
            </h3>
          </div>
          <span className="badge-accent uppercase text-[10px] px-2 py-0.5">{session.difficulty}</span>
        </div>

        {/* Passage Content */}
        <div className="card-liquid p-6 max-h-[50vh] overflow-y-auto custom-scrollbar shadow-sm">
          <div className="text-[17px] text-text-primary leading-[1.7] font-serif">
            {session.passage.split('\n').map((p: string, i: number) => (
              <p key={i} className="mb-5">{p}</p>
            ))}
          </div>
        </div>

        <div className="divider" />

        {/* Progress Tracker */}
        <div className="px-1">
          <div className="flex justify-between items-end mb-2">
            <p className="text-[12px] font-bold uppercase tracking-widest text-text-secondary">Questions</p>
            <p className="text-[14px] font-bold text-accent">
              {answeredCount}<span className="text-text-secondary font-normal mx-0.5">/</span>{totalQuestions}
            </p>
          </div>
          <div className="progress-bar h-1.5">
            <div
              className="progress-bar-fill shadow-[0_0_8px_rgba(26,115,232,0.4)]"
              style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Cards */}
        <div className="space-y-4">
          {session.questions.map((q: any, i: number) => (
            <div key={q.id} className="card !p-5 space-y-4 bg-surface/50 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="badge-neutral font-bold rounded-lg w-7 h-7 flex items-center justify-center p-0">
                  {i + 1}
                </span>
                <span className="text-[11px] font-black uppercase tracking-widest text-text-secondary">
                  {getQuestionTypeLabel(q)}
                </span>
              </div>
              
              <p className="text-[16px] font-medium leading-relaxed text-text-primary">{q.question}</p>

              {q.type?.toLowerCase() === 'multiple_choice' && (
                <div className="grid grid-cols-1 gap-2">
                  {(q.options && q.options.length > 0 ? q.options : ['A', 'B', 'C', 'D']).map((opt: string) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                      className={`w-full text-left p-4 rounded-2xl text-[15px] border-2 transition-all active:scale-[0.98] ${
                        answers[q.id] === opt
                          ? 'border-accent bg-accent/5 text-accent shadow-sm'
                          : 'border-line text-text-primary'
                      }`}
                    >
                      <span className={`inline-block w-5 h-5 rounded-full border-2 mr-3 text-center leading-4 text-[10px] ${
                        answers[q.id] === opt ? 'border-accent bg-accent text-white' : 'border-line'
                      }`}>
                        {opt.charAt(0)}
                      </span>
                      {opt.includes('.') ? opt.split('.').slice(1).join('.').trim() : opt}
                    </button>
                  ))}
                </div>
              )}

              {q.type?.toLowerCase() === 'true_false_ng' && (
                <div className="grid grid-cols-3 gap-2">
                  {['True', 'False', 'Not Given'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                      className={`text-[13px] py-3 rounded-xl border-2 font-bold transition-all ${
                        answers[q.id] === opt 
                          ? 'border-accent bg-accent/5 text-accent shadow-sm' 
                          : 'border-line text-text-secondary hover:bg-bg-subtle'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isAllAnswered || submitMutation.isPending}
          className="btn-primary py-4 shadow-xl shadow-accent/20 sticky bottom-4 z-10"
        >
          {submitMutation.isPending ? 'Grading your work...' : 'Complete dictionary task'}
        </button>
      </div>
    );
  }

  if (state === 'results' && results) {
    return (
      <div className="space-y-6 animate-fade-up pb-8">
        <Header
          title="Session Results"
          showBack
          onBack={() => { setState('intro'); setAnswers({}); setResults(null); }}
        />
        
        {/* Score Hero */}
        <div className="card-liquid text-center py-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 blur-sm pointer-events-none">
            <LottieDuck type="celebrate" size={200} />
          </div>
          <div className="font-serif text-[84px] text-accent font-black tracking-tighter leading-none mb-2">
            {results.readingScore}
          </div>
          <p className="text-[13px] font-bold uppercase tracking-widest text-text-secondary">Efficiency Score</p>
          
          <div className="mt-8 flex items-center justify-center gap-6">
            <div className="text-center">
              <p className="text-xl font-black text-text-primary">{results.correctAnswers}</p>
              <p className="text-[11px] font-bold text-text-secondary uppercase">Correct</p>
            </div>
            <div className="w-px h-8 bg-line" />
            <div className="text-center">
              <p className="text-xl font-black text-text-primary">{results.totalQuestions}</p>
              <p className="text-[11px] font-bold text-text-secondary uppercase">Total</p>
            </div>
          </div>
        </div>

        <p className="text-[12px] font-bold uppercase tracking-widest text-text-secondary px-1">Detailed Breakdown</p>

        <div className="space-y-3">
          {results.answers.map((ans: any, i: number) => {
            const isPartial = !ans.isCorrect && ans.aiExplanation?.toLowerCase().includes('partial');
            const cardClass = ans.isCorrect ? 'card-success' : isPartial ? 'card-warning' : 'card-error';
            const icon = ans.isCorrect ? '✓' : isPartial ? '◑' : '×';

            return (
              <div key={ans.questionId} className={`${cardClass} !p-5 shadow-sm`} style={{ animationDelay: `${i * 80}ms` }}>
                <div className="flex items-center gap-2 mb-3">
                   <span className="badge-neutral font-bold rounded-lg w-6 h-6 flex items-center justify-center p-0">
                    {i + 1}
                  </span>
                  <span className="text-[14px] font-bold text-text-primary">{icon} Question {i+1}</span>
                </div>
                
                <p className="text-[13px] text-text-secondary mb-3">
                  <span className="font-bold">Your input:</span> {ans.answer || '(empty)'}
                </p>

                {!ans.isCorrect && ans.correctAnswer && (
                  <div className="p-3 bg-white/50 dark:bg-black/20 rounded-xl mb-3 border border-line">
                    <p className="text-[13px] font-bold text-[#34a853]">Correct Answer:</p>
                    <p className="text-[13px] text-text-primary">{ans.correctAnswer}</p>
                  </div>
                )}
                
                <button
                  type="button"
                  onClick={() => setOpenAccordion((o) => ({ ...o, [ans.questionId]: !o[ans.questionId] }))}
                  className="text-[12px] font-black uppercase tracking-widest text-text-secondary flex items-center gap-1 hover:text-accent transition-colors"
                >
                  {openAccordion[ans.questionId] ? 'Hide explanation ▲' : 'View AI Analysis ▼'}
                </button>
                {openAccordion[ans.questionId] && (
                  <div className="mt-3 pt-3 border-t border-line/30 animate-fade-down">
                    <p className="text-[13px] text-text-primary leading-relaxed italic">
                      {ans.aiExplanation || ans.explanation}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-4">
          <button type="button" className="btn-primary" onClick={() => { setState('intro'); setAnswers({}); setResults(null); }}>
             New Session
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate('/dashboard')}>
             Dashboard
          </button>
        </div>
      </div>
    );
  }

  return null;
}
