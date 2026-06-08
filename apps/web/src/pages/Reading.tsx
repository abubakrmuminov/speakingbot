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

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const getQuestionTypeLabel = (q: any) => {
    if (q.type === 'true_false_ng') return 'True / False / NG';
    if (q.type === 'open') return 'Open question';
    return 'Multiple choice';
  };

  const totalQuestions = session?.questions?.length ?? 0;
  const answeredCount = (session?.questions ?? []).filter(
    (q: any) => (answers[q.id]?.trim()?.length ?? 0) > 0,
  ).length;
  const isAllAnswered = answeredCount === totalQuestions;

  if (state === 'intro') {
    return (
      <div className="flex flex-col flex-1 animate-fade-up">
        <Header title="Reading" showBack={true} />
        
        <div className="flex-1 flex flex-col justify-center px-4 space-y-12 pb-12">
          <div className="text-center space-y-6">
            <LottieDuck type="hello" size={200} className="mx-auto" />
            <div className="space-y-2">
              <h2 className="font-serif text-4xl text-text-primary tracking-tight font-black">Academic Reading</h2>
              <p className="text-[15px] text-text-secondary max-w-[280px] mx-auto leading-relaxed opacity-60 italic">
                Advanced IELTS-style passages to sharpen your comprehension.
              </p>
            </div>
          </div>

          <div className="space-y-4">
             <div className="flex p-1 bg-bg-subtle border border-line/20 rounded-[24px]">
                {(['B2', 'C1'] as const).map((d) => (
                  <button 
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 py-4 rounded-[20px] text-[13px] font-black uppercase tracking-widest transition-all ${
                      difficulty === d ? 'bg-white text-accent shadow-xl shadow-black/5' : 'text-text-secondary opacity-50'
                    }`}
                  >
                    {d} Level
                  </button>
                ))}
             </div>
             <button type="button" onClick={handleStart} className="btn-primary !py-5 shadow-2xl shadow-accent/20">
               Generate Study Session
             </button>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'loading') {
    return (
      <div className="flex flex-col flex-1 justify-center animate-fade-up px-4 text-center pb-20">
        <LottieDuck type="thinking" size={240} className="mb-8" />
        <h3 className="text-xl font-black uppercase tracking-widest text-text-primary animate-pulse">Analyzing text...</h3>
        <p className="text-[13px] text-text-secondary mt-2 opacity-60 uppercase font-black tracking-tighter">Preparing your academic challenge</p>
      </div>
    );
  }

  if (state === 'reading' && session) {
    const currentQuestion = session.questions[currentQuestionIndex];
    const isFirst = currentQuestionIndex === 0;
    const isLast = currentQuestionIndex === totalQuestions - 1;

    return (
      <div className="flex flex-col flex-1 animate-fade-up">
        <header className="h-14 px-4 flex items-center justify-between liquid-glass sticky top-0 z-50">
           <button onClick={() => setState('intro')} className="btn-icon">←</button>
           <div className="flex-1 text-center">
              <span className="text-[11px] font-black uppercase tracking-widest opacity-40">Progress</span>
              <div className="flex justify-center gap-1 mt-0.5">
                 {session.questions.map((_: any, idx: number) => (
                   <div 
                    key={idx} 
                    className={`h-1 rounded-full transition-all duration-300 ${
                      idx === currentQuestionIndex ? 'w-6 bg-accent' : idx < answeredCount ? 'w-2 bg-accent/40' : 'w-2 bg-line'
                    }`} 
                   />
                 ))}
              </div>
           </div>
           <div className="w-10" />
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8 custom-scrollbar">
          {/* Focused Passage View */}
          <div className="card-liquid !p-8 shadow-2xl shadow-black/5 border-0">
             <div className="inline-block px-3 py-1 bg-accent/5 rounded-full text-[10px] font-black uppercase tracking-widest text-accent mb-6">
                Reading Passage
             </div>
             <div className="text-[19px] text-text-primary leading-[1.8] font-serif space-y-6">
                {session.passage.split('\n').map((p: string, i: number) => (
                  <p key={i}>{p}</p>
                ))}
             </div>
          </div>

          {/* Question Focus Card */}
          <div className="space-y-6 pb-24">
             <div className="card !p-8 animate-fade-up border-0 shadow-2xl shadow-black/5 bg-accent/5">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-[11px] font-black uppercase tracking-widest text-accent">Question {currentQuestionIndex + 1}</span>
                  <span className="px-3 py-1 bg-white rounded-full text-[10px] font-bold text-text-secondary shadow-sm">{getQuestionTypeLabel(currentQuestion)}</span>
                </div>
                
                <h3 className="font-serif text-xl font-bold text-text-primary leading-tight mb-8">
                  {currentQuestion.question}
                </h3>

                {currentQuestion.type?.toLowerCase() === 'multiple_choice' && (
                  <div className="grid grid-cols-1 gap-3">
                    {(currentQuestion.options || ['A', 'B', 'C', 'D']).map((opt: string) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setAnswers({ ...answers, [currentQuestion.id]: opt })}
                        className={`w-full text-left p-5 rounded-[24px] text-[15px] border-2 transition-all duration-300 ${
                          answers[currentQuestion.id] === opt
                            ? 'border-accent bg-accent/5 text-accent shadow-xl shadow-accent/10'
                            : 'border-line/20 bg-bg-subtle text-text-primary hover:border-line'
                        }`}
                      >
                         <div className="flex items-center gap-4">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                              answers[currentQuestion.id] === opt ? 'bg-accent text-white' : 'bg-bg text-text-secondary border border-line/30'
                            }`}>
                               {opt.charAt(0)}
                            </span>
                            <span className="font-bold">{opt.includes('.') ? opt.split('.').slice(1).join('.').trim() : opt}</span>
                         </div>
                      </button>
                    ))}
                  </div>
                )}

                {currentQuestion.type?.toLowerCase() === 'true_false_ng' && (
                  <div className="grid grid-cols-1 gap-3">
                    {['True', 'False', 'Not Given'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setAnswers({ ...answers, [currentQuestion.id]: opt })}
                        className={`w-full text-left p-5 rounded-[24px] font-black uppercase tracking-widest text-[12px] border-2 transition-all duration-300 ${
                          answers[currentQuestion.id] === opt 
                            ? 'border-accent bg-accent/5 text-accent shadow-xl shadow-accent/10' 
                            : 'border-line/20 bg-bg-subtle text-text-primary hover:border-line'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
             </div>

             <div className="flex gap-4">
                <button 
                  disabled={isFirst}
                  onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                  className="flex-1 h-16 rounded-[24px] bg-bg-subtle text-text-secondary font-black uppercase tracking-widest text-[11px] disabled:opacity-20 transition-all active:scale-95"
                >
                  Previous
                </button>
                {!isLast ? (
                   <button 
                    onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                    className="flex-1 h-16 rounded-[24px] bg-accent text-white font-black uppercase tracking-widest text-[11px] shadow-xl shadow-accent/20 transition-all active:scale-95"
                  >
                    Next
                  </button>
                ) : (
                  <button 
                    onClick={handleSubmit}
                    disabled={!isAllAnswered || submitMutation.isPending}
                    className="flex-1 h-16 rounded-[24px] bg-black text-white font-black uppercase tracking-widest text-[11px] shadow-xl shadow-black/20 transition-all active:scale-95"
                  >
                    Complete
                  </button>
                )}
             </div>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'results' && results) {
    return (
      <div className="flex flex-col flex-1 animate-fade-up pb-8 pt-4 px-4 space-y-8">
        <div className="text-center space-y-4 py-8">
           <LottieDuck type="celebrate" size={160} className="mx-auto" />
           <div className="space-y-1">
              <span className="text-[12px] font-black uppercase tracking-widest text-accent opacity-60">Session Complete</span>
              <h2 className="font-serif text-5xl font-black text-text-primary tracking-tighter">
                {results.readingScore}
              </h2>
              <p className="text-[13px] font-bold text-text-secondary opacity-60 uppercase tracking-widest">Efficiency Points</p>
           </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="card text-center !p-6 border-0 bg-bg-subtle">
             <p className="text-3xl font-black text-text-primary font-serif">{results.correctAnswers}</p>
             <p className="text-[11px] font-black uppercase tracking-widest opacity-40">Correct</p>
          </div>
          <div className="card text-center !p-6 border-0 bg-bg-subtle">
             <p className="text-3xl font-black text-text-primary font-serif">{results.totalQuestions}</p>
             <p className="text-[11px] font-black uppercase tracking-widest opacity-40">Total</p>
          </div>
        </div>

        <button 
          onClick={() => { setState('intro'); setAnswers({}); setResults(null); setCurrentQuestionIndex(0); }}
          className="btn-primary !py-5 shadow-2xl shadow-accent/20 transition-all duration-500"
        >
          New Passage
        </button>
        <button 
          onClick={() => navigate('/dashboard')}
          className="w-full py-4 text-[12px] font-black uppercase tracking-widest text-text-secondary opacity-40 hover:opacity-100 transition-all"
        >
          Back to choices
        </button>
      </div>
    );
  }

  return null;
}
