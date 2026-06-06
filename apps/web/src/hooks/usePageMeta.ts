import { useContext, useEffect } from 'react';
import { PageMetaContext, type PageMeta } from '../components/PageMetaProvider';

export function usePageMeta(override: PageMeta) {
  const ctx = useContext(PageMetaContext);
  useEffect(() => {
    if (!ctx) return;
    ctx.setMeta(override);
    return () => ctx.setMeta({});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [override.title, override.hideHeader, ctx]);
}

export function usePageMetaState() {
  const ctx = useContext(PageMetaContext);
  return ctx?.meta ?? {};
}
