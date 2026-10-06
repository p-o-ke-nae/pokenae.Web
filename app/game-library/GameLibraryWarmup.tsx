'use client';

import { useEffect } from 'react';

const WARMUP_KEY = 'pokenae:game-library:warmup:v1';

export default function GameLibraryWarmup() {
  useEffect(() => {
    if (sessionStorage.getItem(WARMUP_KEY)) return;
    sessionStorage.setItem(WARMUP_KEY, '1');
    void fetch('/api/warmup/game-library', { cache: 'no-store' }).catch(() => undefined);
  }, []);

  return null;
}
