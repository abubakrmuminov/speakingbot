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
      <div className="flex flex-col flex-1 justify-center animate-fade-up px-4 text-center pb-20">
        <LottieDuck type="search" size={240} className="mx-auto" />
        <h3 className="text-xl font-black uppercase tracking-widest text-text-primary animate-pulse">Finding partner...</h3>
        <p className="text-[13px] text-text-secondary mt-2 opacity-60 uppercase font-black tracking-tighter">Setting up the scenario</p>
      </div>
    );
  }

  if ((phase === 'topic' || phase === 'idle') && topic) {
    return (
      <div className="flex flex-col flex-1 animate-fade-up">
        <Header title="Listening" showBack={true} />
        
        <div className="flex-1 flex flex-col justify-center px-4 space-y-12 pb-12">
          <div className="text-center space-y-6">
            <LottieDuck type="hello" size={200} className="mx-auto" />
            <div className="space-y-2">
              <h2 className="font-serif text-4xl text-text-primary tracking-tight font-black">{scenarioLabel}</h2>
              <p className="text-[15px] text-text-secondary max-w-[280px] mx-auto leading-relaxed opacity-60 italic">
                "{topic.topic}"
              </p>
            </div>
          </div>

          <div className="space-y-4">
             <div className="flex items-center justify-center gap-2 mb-2">
                <span className="badge-accent uppercase text-[10px] px-3 py-1">{topic.difficulty} level</span>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">~5m Practice</span>
             </div>
             
             <button
                type="button"
                className="btn-primary !py-5 shadow-2xl shadow-accent/20 flex items-center justify-center gap-3"
                onClick={() => { setPhase('recording'); void startRecording(); }}
              >
                <span className="text-xl">🎙</span> Start Speaking
              </button>
             
             <button
               onClick={() => { reset(); startMutation.mutate(); }}
               className="w-full py-4 text-[11px] font-black uppercase tracking-widest text-text-secondary opacity-40 hover:opacity-100 transition-all"
             >
               Change Scenario
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
      <div className="flex flex-col flex-1 animate-fade-up">
        <header className="h-14 px-4 flex items-center justify-between liquid-glass sticky top-0 z-50">
           <button onClick={handleClose} className="btn-icon">×</button>
           <div className="text-center">
              <span className="text-[11px] font-black uppercase tracking-widest text-accent animate-pulse">Live Analysis</span>
           </div>
           <div className="w-10" />
        </header>

        <div className="flex-1 flex flex-col justify-center px-4 space-y-12 pb-20">
          <div className="text-center space-y-8">
            <div className="text-7xl font-serif text-text-primary font-black tracking-tighter tabular-nums">
               {mins}<span className="opacity-20">:</span>{secs}
            </div>
            
            <div className="h-24 flex items-center justify-center p-8 bg-accent/5 rounded-[40px]">
               {analyserNode && <Waveform analyserNode={analyserNode} />}
            </div>
          </div>

          <div className="flex flex-col items-center gap-8">
            <button
              type="button"
              onClick={handleStopRecording}
              className="w-28 h-28 rounded-full bg-[#d93025] text-white text-3xl flex items-center justify-center shadow-2xl shadow-red-500/40 active:scale-90 transition-all border-[12px] border-white"
            >
              ⏹
            </button>
            <div className="text-center">
              <p className="text-[14px] font-black uppercase tracking-widest text-text-primary">Finish Speaking</p>
              <p className="text-[12px] text-text-secondary mt-1 opacity-50 italic">AI will analyze your performance</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'processing') {
    return (
      <div className="flex flex-col flex-1 justify-center animate-fade-up px-4 text-center pb-20">
        <LottieDuck type="search" size={240} className="mx-auto" />
        <h3 className="text-xl font-black uppercase tracking-widest text-text-primary animate-pulse">Analyzing pronunciation...</h3>
        <p className="text-[13px] text-text-secondary mt-2 opacity-60 uppercase font-black tracking-tighter">Decoding your fluency patterns</p>
      </div>
    );
  }

  if (phase === 'results' && result) {
    const s = result as any;
    return (
      <div className="flex flex-col flex-1 animate-fade-up px-4 py-8 space-y-8 overflow-y-auto custom-scrollbar">
        <div className="text-center space-y-4 py-8">
           <LottieDuck type="celebrate" size={160} className="mx-auto" />
           <div className="space-y-1">
              <span className="text-[12px] font-black uppercase tracking-widest text-accent opacity-60">Mastery Achievement</span>
              <h2 className="font-serif text-5xl font-black text-text-primary tracking-tighter">
                {s.fluencyScore}
              </h2>
              <p className="text-[13px] font-bold text-text-secondary opacity-60 uppercase tracking-widest">Fluency Score</p>
           </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="card text-center !p-6 border-0 bg-bg-subtle">
             <p className="text-3xl font-black text-text-primary font-serif">{s.vocabularyScore}%</p>
             <p className="text-[11px] font-black uppercase tracking-widest opacity-40">Vocab</p>
          </div>
          <div className="card text-center !p-6 border-0 bg-bg-subtle">
             <p className="text-3xl font-black text-text-primary font-serif">{s.accuracyScore}%</p>
             <p className="text-[11px] font-black uppercase tracking-widest opacity-40">Accuracy</p>
          </div>
        </div>

        <div className="space-y-4">
           <p className="text-[12px] font-black uppercase tracking-widest text-text-secondary px-1 opacity-60 italic">AI Feedback</p>
           <div className="card-liquid !p-8 shadow-2xl shadow-black/5 bg-accent/5 border-0">
              <p className="font-serif text-lg text-text-primary leading-relaxed">
                "{s.dialogueReply}"
              </p>
              <button
                type="button"
                onClick={() => speak(s.dialogueReply)}
                className="mt-6 text-[11px] font-black text-accent uppercase tracking-widest px-6 py-3 bg-white rounded-full shadow-sm"
              >
                🔊 Hear AI Reply
              </button>
           </div>

           <div className="card-liquid !p-8 border-0 bg-bg-subtle/50">
              <h4 className="text-[11px] font-black uppercase tracking-widest text-text-secondary mb-3">Recommendation</h4>
              <p className="text-[14px] text-text-primary leading-relaxed">{s.tipsForImprovement}</p>
           </div>
        </div>

        <div className="space-y-3 pt-4">
          <button
            type="button"
            className="btn-primary !py-5 shadow-2xl shadow-accent/20"
            onClick={handleNewSession}
          >
            New Practice
          </button>
          <button
            type="button"
            className="w-full py-4 text-[11px] font-black uppercase tracking-widest text-text-secondary opacity-40"
            onClick={handleClose}
          >
            Return to Choices
          </button>
        </div>
      </div>
    );
  }

  return null;
}
