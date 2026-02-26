'use client';

import { forwardRef, useEffect, useRef } from "react";
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
		const internalRef = useRef<HTMLDialogElement>(null);
		const dialogRef = (ref as React.RefObject<HTMLDialogElement>) ?? internalRef;

		useEffect(() => {
			const dialog = dialogRef.current;
			if (!dialog) return;
			if (open && !dialog.open) {
				dialog.showModal();
			} else if (!open && dialog.open) {
				dialog.close();
			}
		}, [open, dialogRef]);

		const classes = ["custom-dialog", className].filter(Boolean).join(" ");

		return (
			<>
				<dialog
					ref={dialogRef}
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
						translate: -50% -50%;
						margin: 0;
						width: min(90vw, 28rem);
						border: none;
						border-radius: 0.75rem;
						background-color: var(--color-base-70-light);
						color: var(--color-text-strong);
						box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
						padding: 0;
						overflow: hidden;
					}

					.custom-dialog::backdrop {
						background-color: rgba(0, 0, 0, 0.4);
						backdrop-filter: blur(2px);
					}

					.custom-dialog__header {
						display: flex;
						align-items: center;
						justify-content: space-between;
						padding: 1rem 1.25rem 0.75rem;
						border-bottom: 1px solid var(--color-base-70-dark);
					}

					.custom-dialog__title {
						font-size: 1rem;
						font-weight: 700;
						margin: 0;
					}

					.custom-dialog__close {
						background: none;
						border: none;
						cursor: pointer;
						font-size: 1rem;
						color: var(--color-text-strong);
						opacity: 0.6;
						padding: 0.25rem;
						line-height: 1;
						border-radius: 0.25rem;
						transition: opacity 120ms ease;
					}

					.custom-dialog__close:hover {
						opacity: 1;
					}

					.custom-dialog__body {
						padding: 1.25rem;
					}

					.custom-dialog__footer {
						display: flex;
						justify-content: flex-end;
						gap: 0.5rem;
						padding: 0.75rem 1.25rem 1rem;
						border-top: 1px solid var(--color-base-70-dark);
					}
				`}</style>
			</>
		);
	}
);

CustomDialog.displayName = "CustomDialog";

export default CustomDialog;
