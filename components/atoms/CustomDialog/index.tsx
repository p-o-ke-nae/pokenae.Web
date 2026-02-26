'use client';

import { forwardRef, useCallback, useEffect, useRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";

export type CustomDialogProps = HTMLAttributes<HTMLDialogElement> & {
	open: boolean;
	onClose?: () => void;
	title?: string;
	children?: ReactNode;
	footer?: ReactNode;
};

const CustomDialog = forwardRef<HTMLDialogElement, CustomDialogProps>(
	({ open, onClose, title, children, footer, className = "", ...rest }, ref) => {
		const localRef = useRef<HTMLDialogElement>(null);

		// forwarded ref (RefObject or callback ref) と localRef を安全にマージ
		const setRef = useCallback(
			(node: HTMLDialogElement | null) => {
				(localRef as React.MutableRefObject<HTMLDialogElement | null>).current = node;
				if (typeof ref === "function") {
					ref(node);
				} else if (ref) {
					(ref as React.MutableRefObject<HTMLDialogElement | null>).current = node;
				}
			},
			[ref]
		);

		useEffect(() => {
			const dialog = localRef.current;
			if (!dialog) return;
			if (open && !dialog.open) {
				dialog.showModal();
			} else if (!open && dialog.open) {
				dialog.close();
			}
		}, [open]);

		const classes = ["custom-dialog", className].filter(Boolean).join(" ");

		return (
			<>
				<dialog
					ref={setRef}
					className={classes}
					onClose={onClose}
					{...rest}
				>
					{title && (
						<header className="custom-dialog__header">
							<h2 className="custom-dialog__title">{title}</h2>
							{onClose && (
								<button
									type="button"
									className="custom-dialog__close"
									onClick={onClose}
									aria-label="閉じる"
								>
									✕
								</button>
							)}
						</header>
					)}
					<div className="custom-dialog__body">{children}</div>
					{footer && <footer className="custom-dialog__footer">{footer}</footer>}
				</dialog>

				<style jsx>{`
					.custom-dialog {
						position: fixed;
						top: 50%;
						left: 50%;
						transform: translate(-50%, -50%);
						margin: 0;
						width: min(90vw, 28rem);
						border: none;
						border-radius: 0.875rem;
						background-color: var(--color-base-70-light);
						color: var(--color-text-strong);
						box-shadow:
							0 0 0 1px var(--color-base-70-dark),
							0 24px 64px rgba(31, 31, 42, 0.18);
						padding: 0;
						overflow: hidden;
					}

					.custom-dialog[open] {
						animation: custom-dialog-enter 220ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
					}

					.custom-dialog::backdrop {
						background-color: rgba(31, 31, 42, 0.45);
						backdrop-filter: blur(3px);
						animation: custom-dialog-backdrop-enter 220ms ease forwards;
					}

					.custom-dialog__header {
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

					.custom-dialog__title {
						font-size: 0.9375rem;
						font-weight: 700;
						margin: 0;
						letter-spacing: -0.01em;
					}

					.custom-dialog__close {
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

					.custom-dialog__close:hover {
						opacity: 1;
						background-color: var(--color-base-70);
					}

					.custom-dialog__close:focus-visible {
						outline: 2px solid var(--color-accent-25);
						outline-offset: 1px;
					}

					.custom-dialog__body {
						padding: 1.25rem;
					}

					.custom-dialog__footer {
						display: flex;
						justify-content: flex-end;
						gap: 0.5rem;
						padding: 0.875rem 1.25rem;
						border-top: 1px solid var(--color-base-70-dark);
						background-color: color-mix(in srgb, var(--color-base-70) 40%, var(--color-base-70-light));
					}

					@keyframes custom-dialog-enter {
						from {
							opacity: 0;
							transform: translate(-50%, calc(-50% + 4px)) scale(0.96);
						}
						to {
							opacity: 1;
							transform: translate(-50%, -50%) scale(1);
						}
					}

					@keyframes custom-dialog-backdrop-enter {
						from {
							opacity: 0;
						}
						to {
							opacity: 1;
						}
					}
				`}</style>
			</>
		);
	}
);

CustomDialog.displayName = "CustomDialog";

export default CustomDialog;

