'use client';

import type { CSSProperties, ReactNode } from "react";
import CustomModal, { type CustomModalProps } from "@/components/atoms/CustomModal";
import resources from "@/lib/resources";

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
	...rest
}: DialogProps) => {
	const dialogStyle: CSSProperties = {
		width: sizeWidthMap[size],
		'--dialog-body-max-height': sizeMaxHeightMap[size],
		...style,
	} as CSSProperties;

	return (
		<>
			<CustomModal open={open} onClose={onClose} closeDisabled={closeDisabled} style={dialogStyle} {...rest}>
				{title && (
					<header className="dialog__header">
						<h2 className="dialog__title">{title}</h2>
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
					max-height: var(--dialog-body-max-height, min(60vh, 36rem));
					overflow-y: auto;
				}

				.dialog__footer {
					display: flex;
					flex-wrap: wrap;
					justify-content: flex-end;
					gap: 0.75rem;
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
