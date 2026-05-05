'use client';

import { useId } from "react";
import type { CSSProperties, ReactNode } from "react";
import CustomModal, { type CustomModalProps } from "@/components/atoms/CustomModal";
import resources from "@/lib/resources";
import DialogFooterLayout from "./DialogFooterLayout";

export type DialogProps = Omit<CustomModalProps, "children"> & {
	title?: string;
	children?: ReactNode;
	footer?: ReactNode;
	closeDisabled?: boolean;
	/** Dialog width preset. Defaults to "sm" (28 rem). */
	size?: "sm" | "md" | "lg";
};

const sizeWidthMap: Record<NonNullable<DialogProps["size"]>, string> = {
	sm: "min(90vw, 28rem)",
	md: "min(90vw, 40rem)",
	lg: "min(90vw, 56rem)",
};

const sizeMaxHeightMap: Record<NonNullable<DialogProps["size"]>, string> = {
	sm: "min(60vh, 36rem)",
	md: "min(70vh, 42rem)",
	lg: "min(75vh, 48rem)",
};

const Dialog = ({
	open,
	onClose,
	title,
	children,
	footer,
	closeDisabled = false,
	size = "sm",
	style,
	className,
	"aria-label": ariaLabel,
	"aria-labelledby": ariaLabelledBy,
	...rest
}: DialogProps) => {
	const titleId = useId();
	const dialogStyle: CSSProperties = {
		'--custom-modal-inline-size': sizeWidthMap[size],
		'--custom-modal-max-block-size': sizeMaxHeightMap[size],
		...style,
	} as CSSProperties;
	const modalClassName = ["dialog-modal", className].filter(Boolean).join(" ");
	const resolvedAriaLabelledBy = ariaLabelledBy ?? (title ? titleId : undefined);

	return (
		<>
			<CustomModal
				open={open}
				onClose={onClose}
				closeDisabled={closeDisabled}
				mobileLayout="viewport-fit"
				className={modalClassName}
				style={dialogStyle}
				aria-label={ariaLabel}
				aria-labelledby={resolvedAriaLabelledBy}
				{...rest}
			>
				<div className="dialog__surface">
					{title && (
						<header className="dialog__header">
							<h2 id={titleId} className="dialog__title">{title}</h2>
							{onClose && !closeDisabled ? (
								<button
									type="button"
									className="dialog__close"
									onClick={onClose}
									aria-label={resources.common.close}
								>
									✕
								</button>
							) : null}
						</header>
					)}
					<div className="dialog__body">{children}</div>
					{footer && <footer className="dialog__footer">{footer}</footer>}
				</div>
			</CustomModal>

			<style jsx>{`
				.dialog__surface {
					display: flex;
					flex-direction: column;
					width: 100%;
					max-block-size: inherit;
				}

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
					width: 2.75rem;
					height: 2.75rem;
					flex-shrink: 0;
					background: none;
					border: none;
					cursor: pointer;
					font-size: 1rem;
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
					flex: 1 1 auto;
					min-height: 0;
					padding: 1.25rem;
					overflow-y: auto;
					overscroll-behavior: contain;
					-webkit-overflow-scrolling: touch;
				}

				.dialog__footer {
					display: flex;
					flex-wrap: wrap;
					align-items: center;
					justify-content: flex-end;
					gap: 0.75rem;
					padding: 0.875rem 1.25rem calc(0.875rem + env(safe-area-inset-bottom, 0px));
					border-top: 1px solid var(--color-base-70-dark);
					background-color: color-mix(in srgb, var(--color-base-70) 40%, var(--color-base-70-light));
					flex-shrink: 0;
				}

				.dialog__footer > [role="status"] {
					margin-inline-end: auto;
				}

				.dialog__footer :global(.custom-button) {
					min-height: 2.75rem;
				}

				@media (max-width: 640px) {
					.dialog__header {
						padding: 0.875rem 1rem 0.75rem;
					}

					.dialog__title {
						font-size: 1rem;
					}

					.dialog__body {
						padding: 1rem;
					}

					.dialog__body :global(input:not([type="checkbox"]):not([type="radio"])),
					.dialog__body :global(select),
					.dialog__body :global(textarea) {
						font-size: 1rem;
					}

					.dialog__footer {
						align-items: stretch;
						padding: 0.75rem 1rem calc(0.75rem + env(safe-area-inset-bottom, 0px));
						gap: 0.625rem;
					}

					.dialog__footer > * {
						width: 100%;
					}

					.dialog__footer > [role="status"] {
						margin-inline-end: 0;
					}

					.dialog__footer :global(.custom-button) {
						width: 100%;
					}
				}
			`}</style>
		</>
	);
};

Dialog.displayName = "Dialog";

export { DialogFooterLayout };
export default Dialog;
