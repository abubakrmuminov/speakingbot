import { useNavigate } from 'react-router-dom';
import LottieDuck from '../components/LottieDuck';

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col flex-1 justify-center py-8 space-y-12 animate-fade-up">
      <div className="text-center space-y-4">
        <LottieDuck type="hello" size={140} className="mx-auto" />
        <h1 className="font-serif text-4xl text-text-primary tracking-tight font-black">
          Pick your focus
        </h1>
        <p className="text-[15px] text-text-secondary max-w-[240px] mx-auto leading-relaxed opacity-60">
          What part of the language would you like to master today?
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 px-2">
        <button 
          onClick={() => navigate('/reading')}
          className="group relative h-48 rounded-[32px] overflow-hidden transition-all active:scale-[0.98] border border-line/20 shadow-2xl shadow-black/5"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white to-bg-subtle group-active:opacity-80" />
          <div className="relative h-full flex flex-col justify-center items-center p-6 text-center">
            <span className="text-4xl mb-3">📖</span>
            <h3 className="text-xl font-black uppercase tracking-widest text-text-primary">Reading</h3>
            <p className="text-[12px] text-text-secondary font-bold uppercase opacity-40 mt-1">Academic Dictionary</p>
          </div>
        </button>

        <button 
          onClick={() => navigate('/session')}
          className="group relative h-48 rounded-[32px] overflow-hidden transition-all active:scale-[0.98] border border-line/20 shadow-2xl shadow-black/5"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white to-bg-subtle group-active:opacity-80" />
          <div className="relative h-full flex flex-col justify-center items-center p-6 text-center">
             <span className="text-4xl mb-3">🎙️</span>
             <h3 className="text-xl font-black uppercase tracking-widest text-text-primary">Listening</h3>
             <p className="text-[12px] text-text-secondary font-bold uppercase opacity-40 mt-1">AI Voice Partner</p>
          </div>
        </button>
      </div>
    </div>
  );
}
