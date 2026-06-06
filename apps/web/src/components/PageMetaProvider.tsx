import { createContext, useState, type ReactNode } from 'react';

export interface PageMeta {
  title?: string;
  hideHeader?: boolean;
}

interface PageMetaContextValue {
  meta: PageMeta;
  setMeta: (meta: PageMeta) => void;
}

export const PageMetaContext = createContext<PageMetaContextValue | null>(null);

export function PageMetaProvider({ children }: { children: ReactNode }) {
  const [meta, setMeta] = useState<PageMeta>({});
  return (
    <PageMetaContext.Provider value={{ meta, setMeta }}>
      {children}
    </PageMetaContext.Provider>
  );
}
