'use client';

import type { CSSProperties, ReactNode } from "react";
import CustomModal, { type CustomModalProps } from "@/components/atoms/CustomModal";

export type CustomDialogProps = Omit<CustomModalProps, "children"> & {
	title?: string;
	children?: ReactNode;
	footer?: ReactNode;
};

const CustomDialog = ({
	open,
	onClose,
	title,
	children,
	footer,
	style,
	...rest
}: CustomDialogProps) => {
	const dialogStyle: CSSProperties = {
		width: "min(90vw, 28rem)",
		...style,
	};

	return (
		<>
			<CustomModal open={open} onClose={onClose} style={dialogStyle} {...rest}>
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
			</CustomModal>

			<style jsx>{`
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
					color: var(--color-text-strong);
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
					opacity: 1;
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
			`}</style>
		</>
	);
};

CustomDialog.displayName = "CustomDialog";

export default CustomDialog;
