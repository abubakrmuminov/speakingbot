import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';

const ONBOARDING_KEY = 'speakai_onboarding_done';

const SCREENS = [
  {
    icon: '🎙',
    title: 'Speak. Learn. Improve.',
    subtitle: 'Practice English with an AI that corrects you in real time',
    button: 'Get Started →',
  },
  {
    icon: '🎤',
    title: 'Press. Speak. Improve.',
    subtitle: 'Hold the mic, say anything in English. Get instant feedback on your mistakes.',
    button: 'Continue →',
  },
  {
    icon: '📖',
    title: 'Read. Understand. Grow.',
    subtitle: 'IELTS-style texts with comprehension questions. Track your progress.',
    button: 'Start Practicing',
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
    <div className="app-shell">
      <div className="app-column min-h-screen relative">
        {screen < 2 && (
          <button
            type="button"
            onClick={skip}
            className="absolute top-4 right-4 z-10 btn-ghost text-sm"
          >
            Skip
          </button>
        )}

        <div
          key={animKey}
          className="flex-1 flex flex-col items-center justify-center px-8 text-center animate-fade-up"
        >
          <span className="text-[64px] mb-8">{current.icon}</span>
          <h1 className="font-serif text-2xl text-text-primary mb-3">{current.title}</h1>
          <p className="text-[15px] text-text-secondary leading-relaxed max-w-xs">{current.subtitle}</p>

          <div className="flex gap-2 mt-10">
            {SCREENS.map((_, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === screen ? 'bg-accent' : 'bg-line'
                }`}
              />
            ))}
          </div>

          <button type="button" onClick={goNext} className="btn-primary mt-8 max-w-xs">
            {current.button}
          </button>
        </div>
      </div>
    </div>
  );
}
