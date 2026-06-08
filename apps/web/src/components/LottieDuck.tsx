import Lottie from 'lottie-react';
import { useEffect, useState } from 'react';

/**
 * Curated Telegram-style Duck (Duckly) Lottie animations
 */
const DUCKS = {
  thinking: 'https://lottie.host/7978f804-629d-4950-848e-28d011f0436d/vH2X6Z8Y8n.json',
  hello: 'https://lottie.host/cf4c8914-f446-4a4e-9d2a-7bf9ced9894e/sS6YV6mX0H.json',
  celebrate: 'https://lottie.host/950005d5-9610-444e-86eb-69b0f69a96e9/O2P1pW6I0m.json',
  study: 'https://lottie.host/17eb68e6-764f-4d92-807d-dc7c9656a84f/O6v7Xn7zX7.json',
  search: 'https://lottie.host/80161a0f-621a-4d22-b52b-7de098522f16/zJ88nS77mZ.json',
};

interface LottieDuckProps {
  type: keyof typeof DUCKS;
  className?: string;
  size?: number;
}

export default function LottieDuck({ type, className = '', size = 120 }: LottieDuckProps) {
  const [animationData, setAnimationData] = useState<any>(null);
  const animationUrl = DUCKS[type];

  useEffect(() => {
    fetch(animationUrl)
      .then((res) => res.json())
      .then((data) => setAnimationData(data))
      .catch((err) => console.error('Failed to load lottie:', err));
  }, [animationUrl]);

  if (!animationData) return <div style={{ width: size, height: size }} />;

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
