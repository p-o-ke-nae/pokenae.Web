'use client';

import { forwardRef, useCallback, useEffect, useRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";

export type CustomModalProps = HTMLAttributes<HTMLDialogElement> & {
	open: boolean;
	onClose?: () => void;
	children?: ReactNode;
};

const CustomModal = forwardRef<HTMLDialogElement, CustomModalProps>(
	({ open, onClose, children, className = "", ...rest }, ref) => {
		const localRef = useRef<HTMLDialogElement>(null);

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

		const classes = ["custom-modal", className].filter(Boolean).join(" ");

		return (
			<>
				<dialog ref={setRef} className={classes} onClose={onClose} {...rest}>
					{children}
				</dialog>

				<style jsx>{`
					.custom-modal {
						position: fixed;
						top: 50%;
						left: 50%;
						transform: translate(-50%, -50%);
						margin: 0;
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

					.custom-modal[open] {
						animation: custom-modal-enter 220ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
					}

					.custom-modal::backdrop {
						background-color: rgba(31, 31, 42, 0.5);
						backdrop-filter: blur(3px);
						animation: custom-modal-backdrop-enter 220ms ease forwards;
					}

					@keyframes custom-modal-enter {
						from {
							opacity: 0;
							transform: translate(-50%, calc(-50% + 4px)) scale(0.96);
						}
						to {
							opacity: 1;
							transform: translate(-50%, -50%) scale(1);
						}
					}

					@keyframes custom-modal-backdrop-enter {
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

CustomModal.displayName = "CustomModal";

export default CustomModal;
