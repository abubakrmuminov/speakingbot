import { create } from 'zustand';
import type { GeneratedTopic, Session } from '@speaking-coach/shared';

type SessionPhase = 'idle' | 'topic' | 'recording' | 'processing' | 'results';

interface SessionState {
  phase: SessionPhase;
  topic: GeneratedTopic | null;
  audioBlob: Blob | null;
  result: Session | null;
  newMilestones: string[];
  error: string | null;

  setPhase: (phase: SessionPhase) => void;
  setTopic: (topic: GeneratedTopic) => void;
  setAudioBlob: (blob: Blob) => void;
  setResult: (result: Session, milestones: string[]) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  phase: 'idle',
  topic: null,
  audioBlob: null,
  result: null,
  newMilestones: [],
  error: null,

  setPhase: (phase) => set({ phase }),
  setTopic: (topic) => set({ topic, phase: 'topic' }),
  setAudioBlob: (audioBlob) => set({ audioBlob }),
  setResult: (result, newMilestones) => set({ result, newMilestones, phase: 'results', error: null }),
  setError: (error) => set({ error, phase: 'idle' }),
  reset: () => set({ phase: 'idle', topic: null, audioBlob: null, result: null, newMilestones: [], error: null }),
}));
