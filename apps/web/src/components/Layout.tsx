import { Outlet, useLocation } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { PageMetaProvider } from './PageMetaProvider';
import { usePageMetaState } from '../hooks/usePageMeta';
import Header from './Header';
import BottomNav from './BottomNav';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/reading': 'Reading',
  '/history': 'History',
  '/progress': 'Progress',
  '/milestones': 'Milestones',
  '/profile': 'Profile',
};

const NO_BOTTOM_NAV = ['/session'];
const NO_HEADER: string[] = [];

function getTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith('/session/') && pathname.endsWith('/pronunciation')) return 'Pronunciation';
  return '';
}

function LayoutInner() {
  useTheme();
  const { pathname } = useLocation();
  const pageMeta = usePageMetaState();

  const isSessionSubRoute = pathname.startsWith('/session/');

  const hideBottomNav =
    NO_BOTTOM_NAV.some((p) => pathname === p || pathname.startsWith(p + '/')) ||
    isSessionSubRoute;

  const title = pageMeta.title ?? getTitle(pathname);
  const showHeader = !pageMeta.hideHeader && !NO_HEADER.includes(pathname) && !!title && !isSessionSubRoute;

  return (
    <div className="app-shell">
      <div className="app-column">
        {showHeader && <Header title={title} />}
        <main className={hideBottomNav ? 'page-content-no-nav' : 'page-content'}>
          <Outlet />
        </main>
        {!hideBottomNav && <BottomNav />}
      </div>
      <div className="hidden md:block fixed inset-0 -z-10 bg-bg-subtle" aria-hidden />
    </div>
  );
}

export default function Layout() {
  return (
    <PageMetaProvider>
      <LayoutInner />
    </PageMetaProvider>
  );
}
