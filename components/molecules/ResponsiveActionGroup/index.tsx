'use client';

import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { RESPONSIVE_ACTION_MOBILE_BREAKPOINT_PX, type LayoutMode } from '@/lib/hooks/useResponsiveLayoutMode';

type HorizontalAlign = 'start' | 'end';

export type ResponsiveActionGroupProps = HTMLAttributes<HTMLDivElement> & {
  layoutMode?: LayoutMode;
  mobileColumns?: 1 | 2;
  align?: HorizontalAlign;
  children?: ReactNode;
};

function alignToJustify(align: HorizontalAlign): string {
  return align === 'end' ? 'flex-end' : 'flex-start';
}

export default function ResponsiveActionGroup({
  layoutMode = 'desktop',
  mobileColumns = 1,
  align = 'start',
  className = '',
  style,
  children,
  ...rest
}: ResponsiveActionGroupProps) {
  const classes = ['responsive-action-group', className].filter(Boolean).join(' ');
  const mergedStyle = {
    ...style,
    '--responsive-action-group-mobile-columns': String(mobileColumns),
    '--responsive-action-group-desktop-justify': alignToJustify(align),
  } as CSSProperties;

  return (
    <>
      <div
        className={classes}
        data-layout-mode={layoutMode}
        style={mergedStyle}
        {...rest}
      >
        {children}
      </div>

      <style jsx>{`
        .responsive-action-group {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: var(--responsive-action-group-desktop-justify);
          gap: 0.5rem;
          min-width: 0;
        }

        .responsive-action-group[data-layout-mode='mobile'] {
          display: grid;
          grid-template-columns: repeat(var(--responsive-action-group-mobile-columns), minmax(0, 1fr));
          align-items: stretch;
          justify-content: stretch;
          width: 100%;
          gap: 0.625rem;
        }

        .responsive-action-group[data-layout-mode='mobile'] :global(.custom-button) {
          width: 100%;
          min-width: 0;
        }

        .responsive-action-group[data-layout-mode='mobile'] > :global(a),
        .responsive-action-group[data-layout-mode='mobile'] > :global(button),
        .responsive-action-group[data-layout-mode='mobile'] > :global(span),
        .responsive-action-group[data-layout-mode='mobile'] > :global(div) {
          min-width: 0;
        }

        @media (max-width: calc(${RESPONSIVE_ACTION_MOBILE_BREAKPOINT_PX}px - 0.02px)) {
          .responsive-action-group {
            display: grid;
            grid-template-columns: repeat(var(--responsive-action-group-mobile-columns), minmax(0, 1fr));
            align-items: stretch;
            justify-content: stretch;
            width: 100%;
            gap: 0.625rem;
          }

          .responsive-action-group :global(.custom-button) {
            width: 100%;
            min-width: 0;
          }

          .responsive-action-group > :global(a),
          .responsive-action-group > :global(button),
          .responsive-action-group > :global(span),
          .responsive-action-group > :global(div) {
            min-width: 0;
          }
        }
      `}</style>
    </>
  );
}