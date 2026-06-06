import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useSessionStore } from '../store/sessionStore';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useSpeech } from '../hooks/useSpeech';
import { useTheme } from '../hooks/useTheme';
import Header from '../components/Header';
import type { ErrorItem } from '@speaking-coach/shared';

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
        const barHeight = (dataArray[i]! / 255) * canvas.height * 0.8;
        ctx.fillStyle = '#1a73e8';
        ctx.beginPath();
        ctx.roundRect(x, canvas.height / 2 - barHeight / 2, barWidth - 1, barHeight, 2);
        ctx.fill();
        x += barWidth;
      }
    };
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyserNode]);

  return <canvas ref={canvasRef} width={320} height={60} className="w-full" />;
}

function ScoreCounter({ target }: { target: number }) {
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let start = 0;
    const duration = 600;
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

function ErrorCard({ item, index }: { item: ErrorItem; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`card-error result-card`} style={{ animationDelay: `${index * 80}ms` }}>
      <div className="text-[15px] text-[#d93025] line-through mb-1">❌ {item.original}</div>
      <div className="text-[15px] text-[#34a853] font-medium mb-2">✅ {item.corrected}</div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-[13px] text-text-secondary flex items-center gap-1"
      >
        💡 Почему? {open ? '▲' : '▼'}
      </button>
      {open && (
        <p className="text-[13px] text-text-secondary mt-2 leading-relaxed">{item.explanation}</p>
      )}
    </div>
  );
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="btn-icon absolute top-4 left-4 z-10" aria-label="Close">
      ×
    </button>
  );
}

export default function Session() {
  useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { speak } = useSpeech();

  const { phase, topic, result, newMilestones, error, setPhase, setTopic, setResult, setError, reset } =
    useSessionStore();

  const { elapsed, analyserNode, audioBlob, startRecording, stopRecording, reset: resetRecorder, error: micError } =
    useAudioRecorder();

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

  const handleClose = () => navigate('/dashboard');

  const scenarioLabel = topic?.scenario?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ?? '';

  if (error) {
    return (
      <div className="app-shell">
        <div className="app-column min-h-screen relative">
          <CloseButton onClick={handleClose} />
          <div className="flex flex-col items-center justify-center flex-1 gap-4 px-6">
            <p className="text-[#d93025] text-center">{error}</p>
            <button type="button" className="btn-secondary max-w-xs" onClick={handleNewSession}>Try Again</button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'topic' && startMutation.isPending) {
    return (
      <div className="app-shell">
        <div className="app-column min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if ((phase === 'topic' || phase === 'idle') && topic) {
    return (
      <div className="app-shell">
        <div className="app-column min-h-screen relative px-4">
          <CloseButton onClick={handleClose} />
          <div className="flex-1 flex flex-col items-center justify-center gap-8 animate-fade-up pb-8">
            <div className="card-liquid w-full p-6">
              <h2 className="font-serif text-xl text-text-primary mb-3">{scenarioLabel}</h2>
              <p className="text-[15px] text-text-secondary leading-relaxed mb-4">{topic.topic}</p>
              <div className="flex items-center gap-2">
                <span className="badge-accent">{topic.difficulty}</span>
                <span className="text-[13px] text-text-secondary">· ~5 min</span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                className="w-20 h-20 rounded-full bg-accent text-white text-3xl flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                onClick={() => { setPhase('recording'); void startRecording(); }}
              >
                🎙
              </button>
              <span className="text-[13px] text-text-secondary">Tap to speak</span>
            </div>

            <button
              type="button"
              className="btn-ghost text-[13px]"
              onClick={() => { reset(); startMutation.mutate(); }}
            >
              🔄 New topic
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'recording') {
    const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const secs = String(elapsed % 60).padStart(2, '0');

    return (
      <div className="app-shell">
        <div className="app-column min-h-screen relative px-4">
          <CloseButton onClick={handleClose} />
          <div className="flex-1 flex flex-col items-center justify-center gap-6 animate-fade-up">
            <p className="text-[13px] text-text-secondary">{scenarioLabel}</p>
            {analyserNode && <div className="w-full px-4"><Waveform analyserNode={analyserNode} /></div>}
            <button
              type="button"
              onClick={handleStopRecording}
              className="w-20 h-20 rounded-full bg-[#d93025] text-white text-2xl flex items-center justify-center mic-recording active:scale-95"
            >
              ⏹
            </button>
            <span className="text-2xl font-medium score-number text-text-primary">{mins}:{secs}</span>
            <span className="text-[13px] text-text-secondary">Recording...</span>
            {micError && <p className="text-[#d93025] text-sm">{micError}</p>}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'processing') {
    return (
      <div className="app-shell">
        <div className="app-column min-h-screen flex flex-col items-center justify-center gap-4">
          <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-[13px] text-text-secondary">Analysing your speech…</p>
        </div>
      </div>
    );
  }

  if (phase === 'results' && result) {
    return (
      <div className="app-shell">
        <div className="app-column min-h-screen">
          <Header title="Results" showBack onBack={handleClose} />
          <div className="page-content-no-nav space-y-4">
            {newMilestones.length > 0 && (
              <div className="card-warning result-card text-center py-4">
                <div className="text-2xl mb-1">🎉</div>
                <p className="font-medium text-text-primary">Achievement Unlocked!</p>
                {newMilestones.map((m) => (
                  <p key={m} className="text-[13px] text-text-secondary mt-1">{m}</p>
                ))}
              </div>
            )}

            <div className="card-liquid text-center py-6 result-card">
              <div className="font-serif text-[64px] text-accent leading-none">
                <ScoreCounter target={result.fluencyScore} />
              </div>
              <p className="text-[13px] text-text-secondary mt-2">Fluency Score</p>
              <p className="text-[13px] text-[#34a853] mt-1">↑ from last session</p>
            </div>

            {result.errorAnalysis.length > 0 && (
              <div>
                <p className="section-label mb-3">Mistakes found</p>
                <div className="divider mb-3" />
                <div className="space-y-3">
                  {result.errorAnalysis.map((item: ErrorItem, i: number) => (
                    <ErrorCard key={i} item={item} index={i} />
                  ))}
                </div>
              </div>
            )}

            <div className="card-accent result-card" style={{ animationDelay: '240ms' }}>
              <p className="section-label mb-2">AI Reply</p>
              <p className="text-[15px] text-text-primary leading-relaxed italic mb-4">
                "{result.dialogueReply}"
              </p>
              <button
                type="button"
                onClick={() => speak(result.dialogueReply)}
                className="btn-secondary !w-auto px-4 py-2 text-[13px] ml-auto block"
              >
                🔊 Listen
              </button>
            </div>

            <div className="card-tip result-card" style={{ animationDelay: '320ms' }}>
              <p className="font-medium text-text-primary mb-1">Pro tip</p>
              <p className="text-[15px] text-text-secondary leading-relaxed">{result.grammarTip}</p>
            </div>

            {result.pronunciationScore !== null && (
              <button
                type="button"
                className="btn-secondary result-card"
                style={{ animationDelay: '400ms' }}
                onClick={() => navigate(`/session/${result.id}/pronunciation`)}
              >
                Pronunciation: {result.pronunciationScore}% — Detailed Analysis →
              </button>
            )}

            <button type="button" className="btn-primary" onClick={handleNewSession}>
              🎙 New Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
