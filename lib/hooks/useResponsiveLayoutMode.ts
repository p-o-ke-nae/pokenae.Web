'use client';

import { useLayoutEffect, useState } from 'react';

export type LayoutMode = 'desktop' | 'mobile';

const MOBILE_BREAKPOINT_PX = 640;

function resolveLayoutMode(width: number): LayoutMode {
  return width < MOBILE_BREAKPOINT_PX ? 'mobile' : 'desktop';
}

export function useResponsiveLayoutMode(defaultMode: LayoutMode = 'desktop'): LayoutMode {
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(defaultMode);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const syncLayoutMode = () => {
      const nextMode = resolveLayoutMode(window.innerWidth);
      setLayoutMode((currentMode) => (currentMode === nextMode ? currentMode : nextMode));
    };

    syncLayoutMode();
    window.addEventListener('resize', syncLayoutMode);

    return () => {
      window.removeEventListener('resize', syncLayoutMode);
    };
  }, []);

  return layoutMode;
}

export const RESPONSIVE_ACTION_MOBILE_BREAKPOINT_PX = MOBILE_BREAKPOINT_PX;