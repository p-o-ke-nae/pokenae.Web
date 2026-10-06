import type { ReactNode } from 'react';
import GameLibraryWarmup from './GameLibraryWarmup';

export default function GameLibraryLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <GameLibraryWarmup />
      {children}
    </>
  );
}
