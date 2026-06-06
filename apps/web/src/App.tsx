import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Onboarding, { isOnboardingDone } from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Session from './pages/Session';
import SessionDetail from './pages/SessionDetail';
import History from './pages/History';
import Progress from './pages/Progress';
import Milestones from './pages/Milestones';
import Reading from './pages/Reading';
import Profile from './pages/Profile';
import PronunciationDetail from './pages/PronunciationDetail';
import TelegramGuard from './components/TelegramGuard';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s: any) => s.accessToken);
  if (!token) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RequireOnboarding({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  if (!isOnboardingDone() && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }
  if (isOnboardingDone() && location.pathname === '/onboarding') {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  const token = useAuthStore((s: any) => s.accessToken);

  return (
    <TelegramGuard>
      <Routes>
        <Route path="/" element={token ? <Navigate to="/dashboard" replace /> : <Landing />} />
        <Route
          path="/onboarding"
          element={
            <RequireAuth>
              <Onboarding />
            </RequireAuth>
          }
        />
        <Route
          path="/session"
          element={
            <RequireAuth>
              <RequireOnboarding>
                <Session />
              </RequireOnboarding>
            </RequireAuth>
          }
        />
        <Route
          element={
            <RequireAuth>
              <RequireOnboarding>
                <Layout />
              </RequireOnboarding>
            </RequireAuth>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/session/:id" element={<SessionDetail />} />
          <Route path="/session/:id/pronunciation" element={<PronunciationDetail />} />
          <Route path="/reading" element={<Reading />} />
          <Route path="/history" element={<History />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/milestones" element={<Milestones />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </TelegramGuard>
  );
}
