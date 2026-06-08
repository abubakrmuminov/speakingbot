import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useSessionStore } from '../store/sessionStore';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useSpeech } from '../hooks/useSpeech';
import { useTheme } from '../hooks/useTheme';
import Header from '../components/Header';
import LottieDuck from '../components/LottieDuck';
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
        <div className="app-column min-h-screen flex flex-col items-center justify-center gap-4">
          <LottieDuck type="search" size={150} />
          <p className="text-[13px] text-text-secondary">Finding a topic…</p>
        </div>
      </div>
    );
  }

  if ((phase === 'topic' || phase === 'idle') && topic) {
    return (
      <div className="app-shell pb-8">
        <div className="app-column min-h-screen relative px-4">
          <CloseButton onClick={handleClose} />
          <div className="flex-1 flex flex-col items-center justify-center gap-8 animate-fade-up">
            
            {/* Hero Section */}
            <div className="text-center pt-8">
              <LottieDuck type="hello" size={160} className="mb-2" />
              <h2 className="font-serif text-3xl text-text-primary tracking-tight">Speaking Scenarios</h2>
              <p className="text-[14px] text-text-secondary mt-1 max-w-[280px] mx-auto leading-relaxed">
                Practice real-life English conversations with AI.
              </p>
            </div>

            <div className="card-liquid w-full p-6 shadow-md border-line/50">
              <div className="flex items-center gap-2 mb-3">
                <span className="badge-accent uppercase text-[10px] px-2 py-0.5">{topic.difficulty}</span>
                <span className="text-[12px] font-bold text-text-secondary uppercase tracking-widest">Scenario</span>
              </div>
              <h3 className="font-serif text-2xl text-text-primary mb-3 leading-tight">{scenarioLabel}</h3>
              <div className="p-4 bg-bg-subtle rounded-2xl border border-line/30 mb-6 italic text-[15px] text-text-secondary leading-relaxed">
                "{topic.topic}"
              </div>
              
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-1.5 text-[13px] text-text-secondary font-medium">
                  <span>⏲</span> ~5 min practice
                </div>
                <button
                  type="button"
                  className="text-[12px] font-black uppercase tracking-widest text-accent flex items-center gap-1"
                  onClick={() => { reset(); startMutation.mutate(); }}
                >
                  🔄 New Topic
                </button>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4 w-full">
              <button
                type="button"
                className="w-full btn-primary py-4 shadow-xl shadow-accent/20 flex items-center justify-center gap-3"
                onClick={() => { setPhase('recording'); void startRecording(); }}
              >
                <span className="text-xl">🎙</span> Start Recording
              </button>
              <p className="text-[11px] font-bold uppercase tracking-widest text-text-secondary opacity-60">
                AI is ready to listen
              </p>
            </div>
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
        <div className="app-column min-h-screen relative px-6">
          <CloseButton onClick={handleClose} />
          <div className="flex-1 flex flex-col items-center justify-center gap-12 animate-fade-up">
            
            <div className="text-center space-y-1">
              <p className="text-[12px] font-black uppercase tracking-widest text-accent animate-pulse">Live Recording</p>
              <h3 className="text-[16px] font-bold text-text-primary uppercase tracking-tight">{scenarioLabel}</h3>
            </div>

            <div className="w-full card-liquid p-8 flex flex-col items-center gap-8 shadow-2xl border-accent/20">
               {analyserNode && (
                 <div className="w-full h-24 flex items-center">
                   <Waveform analyserNode={analyserNode} />
                 </div>
               )}
               
               <div className="text-5xl font-serif text-text-primary score-number tracking-tighter">
                 {mins}<span className="opacity-30 mx-1">:</span>{secs}
               </div>
            </div>

            <div className="flex flex-col items-center gap-6">
              <button
                type="button"
                onClick={handleStopRecording}
                className="w-24 h-24 rounded-full bg-[#d93025] text-white text-3xl flex items-center justify-center shadow-2xl shadow-red-500/30 active:scale-90 transition-all mic-recording border-8 border-white/10"
              >
                ⏹
              </button>
              <div className="text-center">
                <p className="text-[14px] font-bold text-text-primary">Tap to stop</p>
                <p className="text-[12px] text-text-secondary mt-0.5">Your progress is saved automatically</p>
              </div>
            </div>

            {micError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                 <p className="text-[#d93025] text-[13px] font-medium">⚠️ {micError}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'processing') {
    return (
      <div className="app-shell">
        <div className="app-column min-h-screen relative px-6">
          <CloseButton onClick={handleClose} />
          <div className="flex-1 flex flex-col items-center justify-center gap-6 animate-fade-up">
            <LottieDuck type="search" size={200} className="mb-4" />
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-text-primary tracking-tight">AI is analyzing your speech</h3>
              <p className="text-[14px] text-text-secondary leading-relaxed max-w-[240px] mx-auto">
                Comparing your pronunciation and vocabulary to native standards...
              </p>
            </div>
            <div className="w-48 h-1 bg-bg-subtle rounded-full overflow-hidden mt-4">
              <div className="h-full bg-accent animate-loading-bar" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'results' && result) {
    const s = result as any;
    return (
      <div className="app-shell select-none pb-8">
        <div className="app-column min-h-screen relative px-4">
          <CloseButton onClick={handleClose} />
          <div className="flex-1 flex flex-col gap-6 pt-12 animate-fade-up">
            
            {/* Score Hero */}
            <div className="card-liquid text-center py-10 relative overflow-hidden">
               <div className="absolute -top-10 -right-10 opacity-10 rotate-12 pointer-events-none">
                 <LottieDuck type="celebrate" size={240} />
               </div>
               <div className="font-serif text-[84px] text-accent font-black tracking-tighter leading-none mb-1">
                 {s.fluencyScore}
               </div>
               <p className="text-[14px] font-bold uppercase tracking-widest text-text-secondary">Fluency Level</p>
               
               <div className="mt-8 grid grid-cols-2 gap-4 max-w-[280px] mx-auto">
                 <div className="text-center p-3 rounded-2xl bg-white/40 dark:bg-black/20 border border-white/50">
                    <p className="text-lg font-black text-text-primary">{s.vocabularyScore}%</p>
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Vocab</p>
                 </div>
                 <div className="text-center p-3 rounded-2xl bg-white/40 dark:bg-black/20 border border-white/50">
                    <p className="text-lg font-black text-text-primary">{s.accuracyScore}%</p>
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Accuracy</p>
                 </div>
               </div>
            </div>

            {/* Assessment Cards */}
            <div className="space-y-3">
              <p className="text-[12px] font-bold uppercase tracking-widest text-text-secondary px-1">Detailed Feedback</p>
              
              <div className="card-success !p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🌟</span>
                  <h4 className="text-[14px] font-bold text-text-primary uppercase tracking-tight">Key Strengths</h4>
                </div>
                <p className="text-[13px] text-text-secondary leading-relaxed italic">{s.feedback}</p>
              </div>

              <div className="card-warning !p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">💡</span>
                  <h4 className="text-[14px] font-bold text-text-primary uppercase tracking-tight">AI Recommendation</h4>
                </div>
                <p className="text-[13px] text-text-secondary leading-relaxed italic">{s.tipsForImprovement}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4">
              <button
                type="button"
                className="btn-primary flex items-center justify-center gap-2"
                onClick={() => navigate(`/pronunciation/${s.id}`)}
              >
                <span>🔍</span> Phonics
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleClose}
              >
                Done
              </button>
            </div>
          </div>
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
              <div className="card-warning result-card text-center py-6 px-4">
                <LottieDuck type="celebrate" size={120} className="mb-2" />
                <p className="font-bold text-text-primary text-lg">Achievement Unlocked!</p>
                {newMilestones.map((m) => (
                  <p key={m} className="text-[14px] text-text-secondary mt-1 font-medium">{m}</p>
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
