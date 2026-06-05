import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useSessionStore } from '../store/sessionStore';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useSpeech } from '../hooks/useSpeech';
import type { ErrorItem } from '@speaking-coach/shared';

// ─── Waveform Visualizer ──────────────────────────────────────────────────
function Waveform({ analyserNode }: { analyserNode: AnalyserNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyserNode.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i]! / 255) * canvas.height;
        const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
        gradient.addColorStop(0, '#5384ff');
        gradient.addColorStop(1, '#a78bfa');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, canvas.height - barHeight, barWidth - 1, barHeight, 2);
        ctx.fill();
        x += barWidth;
      }
    };
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyserNode]);

  return <canvas ref={canvasRef} width={320} height={80} className="w-full rounded-xl" />;
}

// ─── Animated Score Counter ───────────────────────────────────────────────
function ScoreCounter({ target }: { target: number }) {
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let start = 0;
    const duration = 1200;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      if (spanRef.current) spanRef.current.textContent = String(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target]);

  return <span ref={spanRef} className="score-number">0</span>;
}

// ─── Error card ───────────────────────────────────────────────────────────
function ErrorCard({ item, index }: { item: ErrorItem; index: number }) {
  const delay = `delay-${(index + 1) * 100}` as string;
  return (
    <div className={`card animate-fade-up ${delay}`}>
      <div className="flex items-start gap-3">
        <span className="text-red-400 text-xl mt-0.5">❌</span>
        <div className="flex-1 min-w-0">
          <div className="text-red-400 line-through text-sm mb-1">{item.original}</div>
          <div className="text-emerald-400 font-semibold mb-2">✅ {item.corrected}</div>
          <div className="text-slate-400 text-sm">{item.explanation}</div>
          <div className="mt-2">
            <span className={`badge ${item.category === 'grammar' ? 'badge-blue' : item.category === 'vocabulary' ? 'badge-amber' : 'badge-red'}`}>
              {item.category}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────
export default function Session() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { speak } = useSpeech();

  const { phase, topic, result, newMilestones, error, setPhase, setTopic, setResult, setError, reset } =
    useSessionStore();

  const { state: recState, elapsed, analyserNode, audioBlob, startRecording, stopRecording, reset: resetRecorder, error: micError } =
    useAudioRecorder();

  // ─── Load topic on mount ─────────
  const startMutation = useMutation({
    mutationFn: api.sessions.start,
    onSuccess: (data) => setTopic(data),
    onError: (e) => setError(e instanceof Error ? e.message : 'Failed to load topic'),
  });

  useEffect(() => {
    if (phase === 'idle') {
      setPhase('topic');
      startMutation.mutate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Process audio ───────────────
  const processMutation = useMutation({
    mutationFn: async (blob: Blob) => {
      const form = new FormData();
      form.append('audio', blob, 'recording.webm');
      form.append('topic', topic?.topic ?? '');
      form.append('scenario', topic?.scenario ?? '');
      return api.sessions.process(form);
    },
    onSuccess: ({ session, newMilestones: ms }) => {
      setResult(session, ms);
      void queryClient.invalidateQueries({ queryKey: ['progress-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['fluency-chart'] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Analysis failed'),
  });

  const handleStopRecording = () => {
    stopRecording();
    setPhase('processing');
  };

  // Start processing once blob is ready
  useEffect(() => {
    if (phase === 'processing' && audioBlob) {
      processMutation.mutate(audioBlob);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, audioBlob]);

  const handleNewSession = () => {
    reset();
    resetRecorder();
    setPhase('topic');
    startMutation.mutate();
  };

  const fluencyColor = (score: number) =>
    score >= 70 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-red-400';

  // ─── Render: Error ───────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="text-5xl">⚠️</div>
        <p className="text-red-400 text-center max-w-sm">{error}</p>
        <button className="btn-secondary" onClick={handleNewSession}>Try Again</button>
      </div>
    );
  }

  // ─── Render: Loading topic ───────
  if (phase === 'topic' && startMutation.isPending) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400">Preparing your scenario…</p>
      </div>
    );
  }

  // ─── Render: Topic Card ──────────
  if ((phase === 'topic' || phase === 'idle') && topic) {
    return (
      <div className="max-w-lg mx-auto py-8 flex flex-col items-center gap-6 animate-fade-up">
        <div className="card w-full text-center">
          <div className="badge badge-blue mb-4 text-sm">{topic.scenario.replace('_', ' ')}</div>
          <h1 className="text-2xl font-bold mb-3">🎯 Today's Scenario</h1>
          <p className="text-slate-300 text-lg leading-relaxed mb-2">{topic.topic}</p>
          <div className="border-t border-surface-border pt-4 mt-4">
            <p className="text-slate-400 italic text-sm mb-1">The AI coach says:</p>
            <p className="text-brand-300">"{topic.openingLine}"</p>
          </div>
          <div className="flex items-center justify-center gap-4 mt-4 text-sm text-slate-500">
            <span>Difficulty: <strong className="text-white">{topic.difficulty}</strong></span>
            <span>~5 min</span>
          </div>
        </div>
        <button
          id="start-speaking-btn"
          className="btn-primary flex items-center gap-3 text-lg px-8 py-4"
          onClick={() => { setPhase('recording'); void startRecording(); }}
        >
          <span className="text-2xl">🎙</span> Start Speaking
        </button>
      </div>
    );
  }

  // ─── Render: Recording ──────────
  if (phase === 'recording') {
    const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const secs = String(elapsed % 60).padStart(2, '0');

    return (
      <div className="max-w-lg mx-auto py-8 flex flex-col items-center gap-8 animate-fade-up">
        <h1 className="text-xl font-bold">Recording…</h1>

        {analyserNode && <div className="w-full"><Waveform analyserNode={analyserNode} /></div>}

        <div className="relative flex items-center justify-center">
          <div className="mic-pulse relative w-24 h-24 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-brand-500/20 animate-ping" />
          </div>
          <div className="absolute w-24 h-24 bg-brand-500 rounded-full flex items-center justify-center text-4xl shadow-xl shadow-brand-500/40">
            🎙
          </div>
        </div>

        <div className="text-3xl font-mono font-bold text-slate-300">{mins}:{secs}</div>

        {micError && <p className="text-red-400 text-sm">{micError}</p>}

        <button
          id="stop-recording-btn"
          className="btn-secondary px-10 py-4 text-lg"
          onClick={handleStopRecording}
        >
          ⏹ Stop Recording
        </button>
      </div>
    );
  }

  // ─── Render: Processing ──────────
  if (phase === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-12 h-12 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-lg">Analysing your speech…</p>
        <p className="text-slate-500 text-sm">Gemini is reviewing your recording</p>
      </div>
    );
  }

  // ─── Render: Results ─────────────
  if (phase === 'results' && result) {
    return (
      <div className="max-w-2xl mx-auto py-8 space-y-5 pb-24 md:pb-8">
        {/* New Milestones */}
        {newMilestones.length > 0 && (
          <div className="card border-amber-500/40 bg-amber-500/10 animate-fade-up">
            <div className="text-center">
              <div className="text-3xl mb-2">🎉</div>
              <h3 className="font-bold text-amber-400">Achievement Unlocked!</h3>
              {newMilestones.map((m) => (
                <p key={m} className="text-sm text-amber-300 mt-1">{m}</p>
              ))}
            </div>
          </div>
        )}

        {/* Fluency Score */}
        <div className="card animate-fade-up text-center">
          <div className="text-sm text-slate-400 mb-2">Fluency Score</div>
          <div className={`text-7xl font-extrabold score-number ${fluencyColor(result.fluencyScore)}`}>
            <ScoreCounter target={result.fluencyScore} />
          </div>
          <div className="text-slate-500 text-sm mt-2">/ 100</div>
          <div className="flex justify-center gap-4 mt-4 text-sm text-slate-400">
            {result.wordsPerMinute && <span>🗣 {result.wordsPerMinute} WPM</span>}
            {result.pauseCount !== null && <span>⏸ {result.pauseCount} pauses</span>}
            <span>❌ {result.errorCount} errors</span>
          </div>
          {result.topicFeedback && (
            <p className="mt-4 text-sm text-slate-300 italic text-center max-w-sm mx-auto">
              "{result.topicFeedback}"
            </p>
          )}
        </div>

        {/* Pronunciation Summary */}
        {result.pronunciationScore !== null && (
          <div className="card animate-fade-up delay-75 border-brand-500/20 bg-brand-500/5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Pronunciation Accuracy</div>
                <div className="text-3xl font-bold font-serif text-brand-300">{result.pronunciationScore}%</div>
              </div>
              <button
                className="btn-secondary py-2 px-4 text-sm"
                onClick={() => navigate(`/session/${result.id}/pronunciation`)}
              >
                Detailed Analysis →
              </button>
            </div>
          </div>
        )}

        {/* Errors */}
        {result.errorAnalysis.length > 0 ? (
          <div className="space-y-3">
            <h2 className="font-semibold text-slate-300 animate-fade-up delay-100">Corrections</h2>
            {result.errorAnalysis.map((item: any, i: number) => (
              <ErrorCard key={i} item={item} index={i} />
            ))}
          </div>
        ) : (
          <div className="card animate-fade-up delay-100 text-center py-6">
            <div className="text-3xl mb-2">🎯</div>
            <p className="text-emerald-400 font-semibold">No significant errors — well done!</p>
          </div>
        )}

        {/* AI Reply */}
        <div className="card animate-fade-up delay-300">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">🤖 AI Coach Reply</h2>
            <button
              onClick={() => speak(result.dialogueReply)}
              className="btn-ghost text-xs flex items-center gap-1"
            >
              🔊 Listen
            </button>
          </div>
          <p className="text-slate-300 leading-relaxed">{result.dialogueReply}</p>
        </div>

        {/* Grammar Tip */}
        <div className="card animate-fade-up delay-400 border-brand-500/30 bg-brand-500/5">
          <h2 className="font-semibold mb-2 text-brand-300">💡 Grammar Tip</h2>
          <p className="text-slate-300 text-sm leading-relaxed">{result.grammarTip}</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 animate-fade-up delay-500">
          <button
            id="new-session-btn"
            className="btn-primary flex-1"
            onClick={handleNewSession}
          >
            🎙 New Session
          </button>
          <button
            className="btn-secondary flex-1"
            onClick={() => navigate(`/session/${result.id}`)}
          >
            View Details
          </button>
        </div>
      </div>
    );
  }

  return null;
}
