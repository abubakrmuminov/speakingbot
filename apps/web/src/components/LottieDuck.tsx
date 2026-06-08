import Lottie from 'lottie-react';
import { useEffect, useState } from 'react';

/**
 * Curated Telegram-style Duck (Duckly) Lottie animations
 */
const DUCKS = {
  thinking: 'https://assets9.lottiefiles.com/packages/lf20_p8bfn5to.json',
  hello: 'https://assets5.lottiefiles.com/packages/lf20_m6cu91m9.json',
  celebrate: 'https://assets10.lottiefiles.com/packages/lf20_6p8pzzv3.json',
  study: 'https://assets2.lottiefiles.com/packages/lf20_ycxy99as.json',
  search: 'https://assets10.lottiefiles.com/packages/lf20_96msczpw.json',
};

interface LottieDuckProps {
  type: keyof typeof DUCKS;
  className?: string;
  size?: number;
}

export default function LottieDuck({ type, className = '', size = 120 }: LottieDuckProps) {
  const [animationData, setAnimationData] = useState<any>(null);
  const [error, setError] = useState(false);
  const animationUrl = DUCKS[type];

  useEffect(() => {
    setError(false);
    fetch(animationUrl)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load');
        return res.json();
      })
      .then((data) => setAnimationData(data))
      .catch((err) => {
        console.error('Lottie load error:', err);
        setError(true);
      });
  }, [animationUrl]);

  if (error) {
    return (
      <div 
        className={`flex items-center justify-center bg-accent/5 rounded-full ${className}`} 
        style={{ width: size, height: size, margin: '0 auto' }}
      >
        <span className="text-4xl opacity-50">🦆</span>
      </div>
    );
  }

  if (!animationData) return <div style={{ width: size, height: size, margin: '0 auto' }} />;

  return (
    <div className={`flex items-center justify-center ${className}`} style={{ width: size, height: size, margin: '0 auto' }}>
      <Lottie 
        animationData={animationData}
        loop={true}
        autoplay={true}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
