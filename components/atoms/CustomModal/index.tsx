'use client';

import { forwardRef, useCallback, useEffect, useRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";

let scrollLockDepth = 0;
let previousBodyOverflow = "";
let previousBodyOverscrollBehavior = "";

const lockBodyScroll = () => {
	if (typeof document === "undefined") return;
	if (scrollLockDepth === 0) {
		previousBodyOverflow = document.body.style.overflow;
		previousBodyOverscrollBehavior = document.body.style.overscrollBehavior;
		document.body.style.overflow = "hidden";
		document.body.style.overscrollBehavior = "contain";
	}
	scrollLockDepth += 1;
};

const unlockBodyScroll = () => {
	if (typeof document === "undefined" || scrollLockDepth === 0) return;
	scrollLockDepth -= 1;
	if (scrollLockDepth === 0) {
		document.body.style.overflow = previousBodyOverflow;
		document.body.style.overscrollBehavior = previousBodyOverscrollBehavior;
	}
};

export type CustomModalProps = HTMLAttributes<HTMLDialogElement> & {
	open: boolean;
	onClose?: () => void;
	closeDisabled?: boolean;
	mobileLayout?: "centered" | "viewport-fit";
	children?: ReactNode;
};

const CustomModal = forwardRef<HTMLDialogElement, CustomModalProps>(
	({ open, onClose, closeDisabled = false, mobileLayout = "centered", children, className = "", ...rest }, ref) => {
		const localRef = useRef<HTMLDialogElement>(null);
		const restoreFocusRef = useRef<HTMLElement | null>(null);
		const wasOpenRef = useRef(open);

		const restoreFocus = useCallback(() => {
			const restoreTarget = restoreFocusRef.current;
			restoreFocusRef.current = null;
			if (restoreTarget && restoreTarget.isConnected) {
				requestAnimationFrame(() => {
					restoreTarget.focus();
				});
			}
		}, []);

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

		useEffect(() => {
			wasOpenRef.current = open;
		}, [open]);

		useEffect(() => {
			if (open) {
				const activeElement = document.activeElement;
				restoreFocusRef.current = activeElement instanceof HTMLElement ? activeElement : null;
				lockBodyScroll();
				return () => {
					unlockBodyScroll();
				};
			}

			restoreFocus();
			return undefined;
		}, [open, restoreFocus]);

		useEffect(() => {
			return () => {
				if (wasOpenRef.current) {
					restoreFocus();
				}
			};
		}, [restoreFocus]);

		const handleCancel = useCallback((event: React.SyntheticEvent<HTMLDialogElement, Event>) => {
			if (closeDisabled) {
				event.preventDefault();
			}
		}, [closeDisabled]);

		const handleClose = useCallback(() => {
			if (closeDisabled) {
				const dialog = localRef.current;
				if (dialog && open && !dialog.open) {
					dialog.showModal();
				}
				return;
			}

			onClose?.();
		}, [closeDisabled, onClose, open]);

		const classes = ["custom-modal", className].filter(Boolean).join(" ");

		return (
			<>
				<dialog
					ref={setRef}
					className={classes}
					data-mobile-layout={mobileLayout}
					onCancel={handleCancel}
					onClose={handleClose}
					{...rest}
				>
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
						width: var(--custom-modal-inline-size, auto);
						max-width: min(calc(100vw - 1.5rem), var(--custom-modal-inline-size, calc(100vw - 1.5rem)));
						max-height: var(--custom-modal-max-block-size, calc(100dvh - 1.5rem));
						padding: 0;
						overflow: hidden;
						outline: none;
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

					@media (max-width: 640px) {
						.custom-modal[data-mobile-layout="viewport-fit"] {
							width: calc(100vw - 0.75rem);
							max-width: calc(100vw - 0.75rem);
							max-height: calc(100dvh - 0.75rem);
							border-radius: 1rem;
						}
					}
				`}</style>
			</>
		);
	}
);

CustomModal.displayName = "CustomModal";

export default CustomModal;
