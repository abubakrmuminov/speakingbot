import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { usePageMeta } from '../hooks/usePageMeta';
import Header from '../components/Header';
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
      <div className="space-y-6">
        <div className="text-center pt-4">
          <span className="text-5xl">📖</span>
          <h2 className="font-serif text-2xl text-text-primary mt-4">Reading Practice</h2>
          <p className="text-[13px] text-text-secondary mt-1">IELTS · TOEFL style</p>
        </div>

        <div className="divider" />

        <ul className="space-y-3">
          {['8 questions per session', 'Detailed explanations', 'Tracks your progress'].map((item) => (
            <li key={item} className="flex items-center gap-3 text-[15px] text-text-primary">
              <span className="w-5 h-5 rounded-full border border-line flex items-center justify-center text-[10px] text-text-secondary">○</span>
              {item}
            </li>
          ))}
        </ul>

        <div className="divider" />

        <div>
          <p className="section-label mb-3">Difficulty</p>
          <div className="flex gap-2">
            {(['B2', 'C1'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDifficulty(d)}
                className={difficulty === d ? 'toggle-btn-active' : 'toggle-btn'}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <button type="button" onClick={handleStart} className="btn-primary">
          Generate Passage
        </button>
      </div>
    );
  }

  if (state === 'loading') {
    return (
      <div className="space-y-4 animate-fade-up">
        <div className="skeleton h-6 w-48" />
        <div className="skeleton h-4 w-32" />
        <div className="space-y-2 mt-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-4 w-full" />
          ))}
          <div className="skeleton h-4 w-3/4" />
        </div>
        <p className="text-[13px] text-text-secondary text-center mt-8">Generating your passage...</p>
      </div>
    );
  }

  if (state === 'reading' && session) {
    return (
      <div className="space-y-4 -mt-2">
        <div className="flex items-center justify-end -mb-2">
          <span className="badge-accent">{session.difficulty}</span>
        </div>

        <h2 className="font-serif text-xl text-text-primary">{session.topic}</h2>

        <div className="text-[15px] text-text-primary leading-[1.8] max-h-[40vh] overflow-y-auto custom-scrollbar">
          {session.passage.split('\n').map((p: string, i: number) => (
            <p key={i} className="mb-4">{p}</p>
          ))}
        </div>

        <div className="relative flex items-center py-2">
          <div className="divider flex-1" />
          <span className="px-3 text-[13px] text-text-secondary">Questions</span>
          <div className="divider flex-1" />
        </div>

        <div className="space-y-4">
          {session.questions.map((q: any, i: number) => (
            <div key={q.id} className="card">
              <div className="flex items-center gap-2 mb-3">
                <span className="badge-neutral">{i + 1}</span>
                <span className="text-[13px] text-text-secondary">{getQuestionTypeLabel(q)}</span>
              </div>
              <p className="text-[15px] text-text-primary mb-3">{q.question}</p>

              {q.options && q.type !== 'true_false_ng' && (
                <div className="space-y-2">
                  {q.options.map((opt: string) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                      className={`w-full text-left p-3 rounded-xl text-[15px] border transition-all ${
                        answers[q.id] === opt
                          ? 'border-accent bg-accent/5 text-accent'
                          : 'border-line text-text-primary'
                      }`}
                    >
                      ○ {opt}
                    </button>
                  ))}
                </div>
              )}

              {q.type === 'true_false_ng' && (
                <div className="flex gap-2 flex-wrap">
                  {['True', 'False', 'Not Given'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                      className={answers[q.id] === opt ? 'toggle-btn-active' : 'toggle-btn'}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {!q.options && (
                <textarea
                  rows={3}
                  className="textarea text-[15px]"
                  placeholder="Type your answer..."
                  value={answers[q.id] || ''}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                />
              )}
            </div>
          ))}
        </div>

        <p className="text-[13px] text-text-secondary">
          {answeredCount} / {totalQuestions} answered
        </p>
        <div className="progress-bar">
          <div
            className="progress-bar-fill"
            style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
          />
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isAllAnswered || submitMutation.isPending}
          className="btn-primary"
        >
          {submitMutation.isPending ? 'Grading...' : 'Submit Answers'}
        </button>
      </div>
    );
  }

  if (state === 'results' && results) {
    return (
      <div className="space-y-4 -mt-2">
        <Header
          title="Results"
          showBack
          onBack={() => { setState('intro'); setAnswers({}); setResults(null); }}
        />
        <div className="card-liquid text-center py-6 result-card">
          <div className="font-serif text-[64px] text-accent leading-none">{results.readingScore}</div>
          <p className="text-[13px] text-text-secondary mt-2">Reading Score</p>
          <div className="progress-bar max-w-xs mx-auto mt-3">
            <div
              className="progress-bar-fill"
              style={{ width: `${(results.correctAnswers / results.totalQuestions) * 100}%` }}
            />
          </div>
          <p className="text-[13px] text-text-secondary mt-2">
            {results.correctAnswers}/{results.totalQuestions}
          </p>
        </div>

        <div className="space-y-3">
          {results.answers.map((ans: any, i: number) => {
            const isPartial = !ans.isCorrect && ans.aiExplanation?.toLowerCase().includes('partial');
            const cardClass = ans.isCorrect ? 'card-success' : isPartial ? 'card-warning' : 'card-error';
            const icon = ans.isCorrect ? '✅' : isPartial ? '◑' : '❌';

            return (
              <div key={ans.questionId} className={`${cardClass} result-card`} style={{ animationDelay: `${i * 80}ms` }}>
                <p className="text-[15px] font-medium text-text-primary mb-1">
                  {i + 1} {icon}
                </p>
                <p className="text-[13px] text-text-secondary mb-2">Your answer: {ans.answer || '(empty)'}</p>
                {!ans.isCorrect && ans.correctAnswer && (
                  <p className="text-[13px] text-[#34a853] mb-2">✓ {ans.correctAnswer}</p>
                )}
                {isPartial && <p className="text-[13px] text-[#f9ab00] mb-2">Partially correct</p>}
                <button
                  type="button"
                  onClick={() => setOpenAccordion((o) => ({ ...o, [ans.questionId]: !o[ans.questionId] }))}
                  className="text-[13px] text-text-secondary"
                >
                  ▼ {isPartial ? 'Фидбек от ИИ' : 'Почему?'}
                </button>
                {openAccordion[ans.questionId] && (
                  <p className="text-[13px] text-text-secondary mt-2 leading-relaxed">
                    {ans.aiExplanation || ans.explanation}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-2">
          <button type="button" className="btn-secondary flex-1" onClick={() => { setState('intro'); setAnswers({}); setResults(null); }}>
            New Passage
          </button>
          <button type="button" className="btn-ghost flex-1 border border-line rounded-xl" onClick={() => navigate('/dashboard')}>
            Dashboard
          </button>
        </div>
      </div>
    );
  }

  return null;
}
