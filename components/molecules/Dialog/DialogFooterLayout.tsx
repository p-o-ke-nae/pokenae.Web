'use client';

import type { ReactNode } from "react";
import { RESPONSIVE_ACTION_MOBILE_BREAKPOINT_PX, type LayoutMode } from '@/lib/hooks/useResponsiveLayoutMode';

export type DialogFooterLayoutProps = {
	status?: ReactNode;
	leading?: ReactNode;
	trailing?: ReactNode;
	className?: string;
	layoutMode?: LayoutMode;
};

export default function DialogFooterLayout({ status, leading, trailing, className = "", layoutMode = 'desktop' }: DialogFooterLayoutProps) {
	const classes = ["dialog-footer-layout", className].filter(Boolean).join(" ");

	return (
		<>
			<div className={classes} data-layout-mode={layoutMode}>
				{status ? <div className="dialog-footer-layout__status">{status}</div> : null}
				{leading ? <div className="dialog-footer-layout__leading">{leading}</div> : null}
				{trailing ? <div className="dialog-footer-layout__trailing">{trailing}</div> : null}
			</div>

			<style jsx>{`
				.dialog-footer-layout {
					display: flex;
					width: 100%;
					flex-wrap: wrap;
					align-items: center;
					gap: 0.75rem 1rem;
				}

				.dialog-footer-layout__status {
					flex: 1 1 100%;
					min-width: 0;
				}

				.dialog-footer-layout__leading,
				.dialog-footer-layout__trailing {
					display: flex;
					flex-wrap: wrap;
					align-items: center;
					gap: 0.5rem;
					min-width: 0;
				}

				.dialog-footer-layout__trailing {
					margin-inline-start: auto;
					justify-content: flex-end;
				}

				.dialog-footer-layout[data-layout-mode='mobile'] {
					.dialog-footer-layout {
						flex-direction: column;
						align-items: stretch;
						gap: 0.75rem;
					}
				}

				.dialog-footer-layout[data-layout-mode='mobile'] {
					flex-direction: column;
					align-items: stretch;
					gap: 0.75rem;
				}

				.dialog-footer-layout[data-layout-mode='mobile'] .dialog-footer-layout__status,
				.dialog-footer-layout[data-layout-mode='mobile'] .dialog-footer-layout__leading,
				.dialog-footer-layout[data-layout-mode='mobile'] .dialog-footer-layout__trailing {
					width: 100%;
					margin-inline-start: 0;
				}

				.dialog-footer-layout[data-layout-mode='mobile'] .dialog-footer-layout__leading,
				.dialog-footer-layout[data-layout-mode='mobile'] .dialog-footer-layout__trailing {
					align-items: stretch;
				}

				.dialog-footer-layout[data-layout-mode='mobile'] .dialog-footer-layout__trailing {
					justify-content: stretch;
				}

				@media (max-width: calc(${RESPONSIVE_ACTION_MOBILE_BREAKPOINT_PX}px - 0.02px)) {
					.dialog-footer-layout {
						flex-direction: column;
						align-items: stretch;
						gap: 0.75rem;
					}

					.dialog-footer-layout__status,
					.dialog-footer-layout__leading,
					.dialog-footer-layout__trailing {
						width: 100%;
						margin-inline-start: 0;
					}

					.dialog-footer-layout__leading,
					.dialog-footer-layout__trailing {
						align-items: stretch;
					}

					.dialog-footer-layout__trailing {
						justify-content: stretch;
					}
				}

			`}</style>
		</>
	);
}
