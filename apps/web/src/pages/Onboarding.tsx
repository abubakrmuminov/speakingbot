import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import LottieDuck from '../components/LottieDuck';

const ONBOARDING_KEY = 'speakai_onboarding_done';

const SCREENS = [
  {
    type: 'hello' as const,
    title: 'Begin Your Journey',
    subtitle: 'Practice English with a personal AI professor that corrects you in real time.',
    button: 'Meet Professor Duckly →',
  },
  {
    type: 'thinking' as const,
    title: 'Precision Phonics',
    subtitle: 'Get instant feedback on your pronunciation with visual aids and native-level analysis.',
    button: 'Start Learning →',
  },
  {
    type: 'study' as const,
    title: 'Master Academic English',
    subtitle: 'Dive into sophisticated passages and improve your vocabulary at a rapid pace.',
    button: 'Enter the Classroom',
  },
];

export function isOnboardingDone(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === '1';
}

export function markOnboardingDone(): void {
  localStorage.setItem(ONBOARDING_KEY, '1');
}

export default function Onboarding() {
  useTheme();
  const navigate = useNavigate();
  const [screen, setScreen] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  const goNext = () => {
    if (screen < SCREENS.length - 1) {
      setScreen((s) => s + 1);
      setAnimKey((k) => k + 1);
    } else {
      markOnboardingDone();
      navigate('/dashboard', { replace: true });
    }
  };

  const skip = () => {
    markOnboardingDone();
    navigate('/dashboard', { replace: true });
  };

  const current = SCREENS[screen]!;

  return (
    <div className="app-shell overflow-hidden">
      <div className="app-column min-h-screen relative px-6">
        {screen < 2 && (
          <button
            type="button"
            onClick={skip}
            className="absolute top-6 right-6 z-10 text-[12px] font-black uppercase tracking-widest text-text-secondary opacity-50 hover:opacity-100 transition-opacity"
          >
            Skip Intro
          </button>
        )}

        <div
          key={animKey}
          className="flex-1 flex flex-col items-center justify-center text-center animate-fade-up"
        >
          <div className="relative mb-12">
            <div className="absolute inset-0 bg-accent/10 blur-3xl rounded-full scale-125 animate-pulse" />
            <LottieDuck type={current.type} size={280} className="relative z-10" />
          </div>

          <div className="space-y-4 max-w-xs mb-10">
            <h1 className="font-serif text-[32px] font-black text-text-primary tracking-tight leading-tight">
              {current.title}
            </h1>
            <p className="text-[15px] font-medium text-text-secondary leading-relaxed opacity-80">
              {current.subtitle}
            </p>
          </div>

          <div className="flex gap-3 mb-10">
            {SCREENS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i === screen ? 'w-8 bg-accent' : 'w-2 bg-line'
                }`}
              />
            ))}
          </div>

          <button 
            type="button" 
            onClick={goNext} 
            className="btn-primary !py-4 shadow-xl shadow-accent/20 max-w-xs"
          >
            {current.button}
          </button>
        </div>
      </div>
    </div>
  );
}
