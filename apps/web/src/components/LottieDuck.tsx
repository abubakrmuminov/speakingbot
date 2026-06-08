import Lottie from 'lottie-react';

import thinkingData from '../../public/assets/lottie/thinking.json';
import helloData from '../../public/assets/lottie/hello.json';
import celebrateData from '../../public/assets/lottie/celebrate.json';
import studyData from '../../public/assets/lottie/study.json';
import searchData from '../../public/assets/lottie/search.json';

/**
 * Locally-hosted Duck Lottie animations (no network dependency)
 */
const DUCKS = {
  thinking: thinkingData,
  hello: helloData,
  celebrate: celebrateData,
  study: studyData,
  search: searchData,
};

interface LottieDuckProps {
  type: keyof typeof DUCKS;
  className?: string;
  size?: number;
}

export default function LottieDuck({ type, className = '', size = 120 }: LottieDuckProps) {
  const animationData = DUCKS[type];

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
