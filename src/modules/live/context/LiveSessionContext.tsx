import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type LiveSessionContextValue = {
  activeTitle: string;
  setActiveTitle: (title: string) => void;
};

const LiveSessionContext = createContext<LiveSessionContextValue | null>(null);

export function LiveSessionProvider({ children }: { children: ReactNode }) {
  const [activeTitle, setActiveTitle] = useState('');

  const value = useMemo(
    () => ({
      activeTitle,
      setActiveTitle,
    }),
    [activeTitle]
  );

  return <LiveSessionContext.Provider value={value}>{children}</LiveSessionContext.Provider>;
}

export function useLiveSession(): LiveSessionContextValue {
  const context = useContext(LiveSessionContext);
  if (!context) {
    throw new Error('useLiveSession must be used within LiveSessionProvider');
  }
  return context;
}
