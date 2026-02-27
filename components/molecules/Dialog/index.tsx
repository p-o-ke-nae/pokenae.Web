'use client';

import type { CSSProperties, ReactNode } from "react";
import CustomModal, { type CustomModalProps } from "@/components/atoms/CustomModal";

export type DialogProps = Omit<CustomModalProps, "children"> & {
	title?: string;
	children?: ReactNode;
	footer?: ReactNode;
};

const Dialog = ({
	open,
	onClose,
	title,
	children,
	footer,
	style,
	...rest
}: DialogProps) => {
	const dialogStyle: CSSProperties = {
		width: "min(90vw, 28rem)",
		...style,
	};

	return (
		<>
			<CustomModal open={open} onClose={onClose} style={dialogStyle} {...rest}>
				{title && (
					<header className="dialog__header">
						<h2 className="dialog__title">{title}</h2>
						{onClose && (
							<button
								type="button"
								className="dialog__close"
								onClick={onClose}
								aria-label="閉じる"
							>
								✕
							</button>
						)}
					</header>
				)}
				<div className="dialog__body">{children}</div>
				{footer && <footer className="dialog__footer">{footer}</footer>}
			</CustomModal>

			<style jsx>{`
				.dialog__header {
					display: flex;
					align-items: center;
					justify-content: space-between;
					padding: 1rem 1.25rem 0.875rem;
					border-bottom: 1px solid var(--color-base-70-dark);
					background: linear-gradient(
						to bottom,
						color-mix(in srgb, var(--color-accent-25) 6%, var(--color-base-70-light)),
						var(--color-base-70-light)
					);
				}

				.dialog__title {
					font-size: 0.9375rem;
					font-weight: 700;
					margin: 0;
					letter-spacing: -0.01em;
					color: var(--color-text-strong);
				}

				.dialog__close {
					display: inline-flex;
					align-items: center;
					justify-content: center;
					width: 1.75rem;
					height: 1.75rem;
					background: none;
					border: none;
					cursor: pointer;
					font-size: 0.875rem;
					color: var(--color-text-strong);
					opacity: 0.5;
					border-radius: 0.375rem;
					transition: opacity 120ms ease, background-color 120ms ease;
				}

				.dialog__close:hover {
					opacity: 1;
					background-color: var(--color-base-70);
				}

				.dialog__close:focus-visible {
					outline: 2px solid var(--color-accent-25);
					outline-offset: 1px;
					opacity: 1;
				}

				.dialog__body {
					padding: 1.25rem;
				}

				.dialog__footer {
					display: flex;
					justify-content: flex-end;
					gap: 0.5rem;
					padding: 0.875rem 1.25rem;
					border-top: 1px solid var(--color-base-70-dark);
					background-color: color-mix(in srgb, var(--color-base-70) 40%, var(--color-base-70-light));
				}
			`}</style>
		</>
	);
};

Dialog.displayName = "Dialog";

export default Dialog;
