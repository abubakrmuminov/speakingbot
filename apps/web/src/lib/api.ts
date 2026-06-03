import { useAuthStore } from '../store/authStore';

const BASE = import.meta.env['VITE_API_URL'] ?? '';

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { accessToken, refreshToken, setAccessToken, logout } = useAuthStore.getState();

  const headers: Record<string, string> = {
    ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(init.headers as Record<string, string> | undefined),
  };

  let res = await fetch(`${BASE}${path}`, { ...init, headers });

  // Try refresh if 401
  if (res.status === 401 && refreshToken) {
    const refreshRes = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (refreshRes.ok) {
      const { accessToken: newToken } = (await refreshRes.json()) as { accessToken: string };
      setAccessToken(newToken);
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(`${BASE}${path}`, { ...init, headers });
    } else {
      logout();
      throw new ApiError('Session expired. Please log in again.', 401);
    }
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(body.error ?? `HTTP ${res.status}`, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Auth ──────────────────────────────────────────────────────
export const api = {
  auth: {
    email: (email: string, password: string) =>
      request<{ accessToken: string; refreshToken: string; user: { id: string; name: string | null; email: string | null; telegramUsername: string | null } }>(
        '/auth/email',
        { method: 'POST', body: JSON.stringify({ email, password }) },
      ),
    telegram: (initData: string) =>
      request('/auth/telegram', { method: 'POST', body: JSON.stringify({ initData }) }),
  },

  sessions: {
    start: () => request<import('@speaking-coach/shared').GeneratedTopic>('/sessions/start', { method: 'POST' }),
    process: (formData: FormData) =>
      request<{ session: import('@speaking-coach/shared').Session; newMilestones: string[] }>(
        '/sessions/process',
        { method: 'POST', body: formData },
      ),
    list: (page = 1, pageSize = 20) =>
      request<{ sessions: import('@speaking-coach/shared').Session[]; total: number; page: number; pageSize: number }>(
        `/sessions?page=${page}&pageSize=${pageSize}`,
      ),
    get: (id: string) => request<import('@speaking-coach/shared').Session>(`/sessions/${id}`),
  },

  progress: {
    stats: () => request<import('@speaking-coach/shared').ProgressStats>('/progress/stats'),
    heatmap: () => request<{ heatmap: import('@speaking-coach/shared').HeatmapDay[] }>('/progress/heatmap'),
    errorPatterns: () => request<{ patterns: import('@speaking-coach/shared').ErrorPattern[] }>('/progress/error-patterns'),
    fluencyChart: (days = 30) => request<{ points: import('@speaking-coach/shared').FluencyPoint[] }>(`/progress/fluency-chart?days=${days}`),
  },

  milestones: {
    list: () => request<{ milestones: (import('@speaking-coach/shared').UserMilestone & { label: string })[] }>('/milestones'),
    card: (id: string) => request<{ type: string; label: string; achievedAt: string; userName: string }>(`/milestones/${id}/card`),
  },

  reading: {
    generate: (difficulty?: 'B2' | 'C1') => 
      request<any>('/reading/generate', { method: 'POST', body: JSON.stringify({ difficulty }) }),
    submit: (sessionId: string, answers: { questionId: string; answer: string }[]) =>
      request<import('@speaking-coach/shared').ReadingResult>('/reading/submit', { method: 'POST', body: JSON.stringify({ sessionId, answers }) }),
    history: () => request<import('@speaking-coach/shared').ReadingSession[]>('/reading/history'),
    stats: () => request<{ avgReadingScore: number; totalSessions: number; trend: number }>('/reading/stats'),
  },
};
