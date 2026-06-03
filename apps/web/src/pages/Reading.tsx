import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { ReadingPassage, ReadingResult, UserAnswer } from '@speaking-coach/shared';

type State = 'intro' | 'loading' | 'reading' | 'results';

export default function Reading() {
  const [state, setState] = useState<State>('intro');
  const [difficulty, setDifficulty] = useState<'B2' | 'C1'>('B2');
  const [session, setSession] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<ReadingResult | null>(null);

  // 1. Generate Session
  const generateMutation = useMutation({
    mutationFn: (diff: 'B2' | 'C1') => api.reading.generate(diff),
    onSuccess: (data) => {
      setSession(data);
      setState('reading');
    }
  });

  // 2. Submit Answers
  const submitMutation = useMutation({
    mutationFn: (data: { sessionId: string; answers: { questionId: string; answer: string }[] }) => 
      api.reading.submit(data.sessionId, data.answers),
    onSuccess: (data) => {
      setResults(data);
      setState('results');
    }
  });

  const handleStart = () => {
    setState('loading');
    generateMutation.mutate(difficulty);
  };

  const handleSubmit = () => {
    if (!session) return;
    const formattedAnswers = Object.entries(answers).map(([questionId, answer]) => ({
      questionId,
      answer
    }));
    submitMutation.mutate({
      sessionId: session.sessionId,
      answers: formattedAnswers
    });
  };

  const isAllAnswered = (session?.questions || []).every((q: any) => answers[q.id]?.trim().length > 0);

  // ─── STAGE: Intro ───────────────────────────────────────────
  if (state === 'intro') {
    return (
      <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="glass p-10 rounded-3xl space-y-6 text-center">
          <div className="text-6xl">📖</div>
          <h1 className="text-4xl font-bold gradient-text">Reading Practice</h1>
          <p className="text-slate-400 text-lg leading-relaxed">
            Master academic English with IELTS/TOEFL style passages. 
            Detailed explanations and AI-driven feedback for open questions.
          </p>
          <div className="flex justify-center gap-6 py-4">
             {['B2', 'C1'].map((d) => (
               <button
                 key={d}
                 onClick={() => setDifficulty(d as any)}
                 className={`px-8 py-3 rounded-xl font-bold transition-all ${
                   difficulty === d 
                     ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20 scale-105' 
                     : 'bg-surface-elevated text-slate-400 hover:text-white'
                 }`}
               >
                 {d}
               </button>
             ))}
          </div>
          <button 
            onClick={handleStart}
            className="btn-primary w-full py-4 text-lg font-bold rounded-2xl"
          >
            Generate Passage
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: '8 Questions', sub: 'Varied types', icon: '📝' },
            { label: 'Academic', sub: 'Text focused', icon: '🏛' },
            { label: 'AI Feedback', sub: 'Detailed answers', icon: '🤖' }
          ].map((feat, i) => (
            <div key={i} className="glass p-6 rounded-2xl flex items-center gap-4">
              <span className="text-2xl">{feat.icon}</span>
              <div>
                <p className="font-bold text-sm">{feat.label}</p>
                <p className="text-xs text-slate-500">{feat.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── STAGE: Loading ──────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="h-10 w-48 bg-surface-elevated rounded-lg animate-pulse" />
        <div className="space-y-4">
          <div className="h-64 w-full bg-surface-elevated rounded-3xl animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
               <div key={i} className="h-32 bg-surface-elevated rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
        <p className="text-center text-slate-500 animate-bounce">Gemini is curating your academic passage...</p>
      </div>
    );
  }

  // ─── STAGE: Reading ──────────────────────────────────────────
  if (state === 'reading' && session) {
    return (
      <div className="max-w-5xl mx-auto lg:grid lg:grid-cols-2 gap-8 items-start relative px-4 pb-24 lg:pb-8">
        {/* Left: Passage */}
        <div className="lg:sticky lg:top-24 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold gradient-text">{session.topic}</h2>
            <span className="badge-brand">{session.difficulty}</span>
          </div>
          <div className="glass p-8 rounded-3xl max-h-[60vh] lg:max-h-[75vh] overflow-y-auto custom-scrollbar leading-relaxed text-slate-300">
            {session.passage.split('\n').map((p: string, i: number) => (
              <p key={i} className="mb-4">{p}</p>
            ))}
          </div>
        </div>

        {/* Right: Questions */}
        <div className="space-y-8 mt-8 lg:mt-12">
          {session.questions.map((q: any, i: number) => (
            <div key={q.id} className="glass p-6 rounded-2xl space-y-4 border border-surface-border/50">
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-surface-elevated flex items-center justify-center text-sm font-bold text-brand-400">
                  {i + 1}
                </span>
                <p className="font-medium text-slate-200">{q.question}</p>
              </div>

              {/* Multiple Choice / TFNG */}
              {q.options && (
                <div className="grid gap-2 ml-11">
                  {q.options.map((opt: string) => (
                    <button
                      key={opt}
                      onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                      className={`text-left p-3 rounded-xl text-sm transition-all border ${
                        answers[q.id] === opt 
                          ? 'bg-brand-500/10 border-brand-500 text-brand-300' 
                          : 'bg-surface/50 border-surface-border text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {/* Open Question */}
              {!q.options && (
                <div className="ml-11">
                  <textarea
                    rows={4}
                    placeholder="Type your answer here..."
                    className="w-full bg-surface/50 border border-surface-border rounded-xl p-4 text-sm text-slate-200 focus:border-brand-500 outline-none transition-all"
                    value={answers[q.id] || ''}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                  />
                </div>
              )}
            </div>
          ))}

          <div className="fixed bottom-0 inset-x-0 p-4 bg-surface/80 backdrop-blur-md lg:static lg:bg-transparent lg:p-0 z-40">
             <button
               onClick={handleSubmit}
               disabled={!isAllAnswered || submitMutation.isPending}
               className="btn-primary w-full py-4 rounded-2xl font-bold shadow-2xl disabled:opacity-50 transition-all active:scale-95"
             >
               {submitMutation.isPending ? 'Grading...' : 'Submit Answers'}
             </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── STAGE: Results ──────────────────────────────────────────
  if (state === 'results' && results) {
    return (
      <div className="max-w-3xl mx-auto space-y-10 px-4 pb-20">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Results</h1>
          <div className="flex flex-col items-center gap-2">
            <div className="text-6xl font-black text-brand-400">{results.readingScore}%</div>
            <div className="w-full max-w-xs bg-surface-elevated h-3 rounded-full overflow-hidden">
               <div 
                 className="h-full bg-brand-500 transition-all duration-1000" 
                 style={{ width: `${results.readingScore}%` }}
               />
            </div>
            <p className="text-slate-500 font-medium">
              You got {results.correctAnswers} out of {results.totalQuestions} questions right
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {results.answers.map((ans: any, i: number) => (
            <div 
              key={ans.questionId} 
              className={`glass p-6 rounded-3xl border-l-8 ${
                ans.isCorrect ? 'border-l-green-500' : 'border-l-red-500'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                 <h3 className="font-bold text-lg text-slate-200">Question {i + 1}</h3>
                 <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                   ans.isCorrect ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                 }`}>
                   {ans.isCorrect ? 'CORRECT' : 'INCORRECT'}
                 </span>
              </div>
              
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-slate-500 uppercase tracking-wider text-xs mb-1">Your Answer</p>
                  <p className="text-slate-200">{ans.answer || '(Empty)'}</p>
                </div>

                {!ans.isCorrect && (
                   <div>
                     <p className="text-slate-500 uppercase tracking-wider text-xs mb-1">Correct Answer</p>
                     <p className="text-green-400 font-medium">{ans.correctAnswer}</p>
                   </div>
                )}

                <div className="bg-surface-elevated/50 p-4 rounded-2xl space-y-2">
                  <p className="text-brand-400 font-bold flex items-center gap-2">
                    <span>💡</span> Why?
                  </p>
                  <p className="text-slate-300 leading-relaxed italic">
                    {ans.aiExplanation || ans.explanation}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-4">
           <button 
             onClick={() => window.location.reload()}
             className="btn-primary flex-1 py-4 rounded-2xl font-bold"
           >
             Try Another Passage
           </button>
           <button 
             onClick={() => (window.location.href = '/dashboard')}
             className="btn-ghost flex-1 py-4 rounded-2xl font-bold bg-surface-elevated"
           >
             Return to Dashboard
           </button>
        </div>
      </div>
    );
  }

  return null;
}
