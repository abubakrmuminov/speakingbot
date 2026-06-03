import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Session from './pages/Session';
import SessionDetail from './pages/SessionDetail';
import History from './pages/History';
import Progress from './pages/Progress';
import Milestones from './pages/Milestones';
import Reading from './pages/Reading';
import TelegramGuard from './components/TelegramGuard';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s: any) => s.accessToken);
  if (!token) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const token = useAuthStore((s: any) => s.accessToken);

  return (
    <TelegramGuard>
      <Routes>
        <Route path="/" element={token ? <Navigate to="/dashboard" replace /> : <Landing />} />
        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/session" element={<Session />} />
          <Route path="/session/:id" element={<SessionDetail />} />
          <Route path="/reading" element={<Reading />} />
          <Route path="/history" element={<History />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/milestones" element={<Milestones />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </TelegramGuard>
  );
}
    