'use client';

import React, { createContext, useContext, ReactNode } from 'react';

export const PageModes = {
  EDIT: 'edit',
  READ_ONLY: 'read-only',
  // 将来的に追加するモード
} as const;

export type PageMode = typeof PageModes[keyof typeof PageModes];

const PageModeContext = createContext<PageMode>(PageModes.READ_ONLY);

interface PageModeProviderProps {
  value: PageMode;
  children: ReactNode;
}

export const PageModeProvider = ({ value, children }: PageModeProviderProps) => {
  return (
    <PageModeContext.Provider value={value}>
      {children}
    </PageModeContext.Provider>
  );
};

export const usePageMode = (): PageMode => {
  return useContext(PageModeContext);
};
