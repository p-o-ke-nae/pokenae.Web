'use client';

import type { ReactNode } from "react";

export type DialogFooterLayoutProps = {
	leading?: ReactNode;
	trailing?: ReactNode;
	className?: string;
};

export default function DialogFooterLayout({ leading, trailing, className = "" }: DialogFooterLayoutProps) {
	const classes = ["dialog-footer-layout", className].filter(Boolean).join(" ");

	return (
		<>
			<div className={classes}>
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

				@media (max-width: 640px) {
					.dialog-footer-layout {
						flex-direction: column;
						align-items: stretch;
						gap: 0.75rem;
					}

					.dialog-footer-layout__leading,
					.dialog-footer-layout__trailing {
						width: 100%;
						margin-inline-start: 0;
					}

					.dialog-footer-layout__trailing {
						flex-direction: column;
						align-items: stretch;
					}

					.dialog-footer-layout__trailing :global(.custom-button) {
						width: 100%;
					}
				}
			`}</style>
		</>
	);
}
