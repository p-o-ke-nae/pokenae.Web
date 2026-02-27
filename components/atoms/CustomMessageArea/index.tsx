'use client';

import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";

type Variant = "info" | "success" | "warning" | "error";

export type CustomMessageAreaProps = HTMLAttributes<HTMLDivElement> & {
	variant?: Variant;
	children?: ReactNode;
	banner?: boolean;
};

const ICONS: Record<Variant, string> = {
	info: "ℹ",
	success: "✓",
	warning: "⚠",
	error: "✕",
};

const ARIA_ROLES: Record<Variant, "status" | "alert"> = {
	info: "status",
	success: "status",
	warning: "alert",
	error: "alert",
};

const CustomMessageArea = forwardRef<HTMLDivElement, CustomMessageAreaProps>(
	({ variant = "info", banner = false, className = "", children, ...rest }, ref) => {
		const classes = [
			"custom-message-area",
			`custom-message-area--${variant}`,
			banner ? "custom-message-area--banner" : "",
			className,
		]
			.filter(Boolean)
			.join(" ");

		return (
			<>
				<div
					ref={ref}
					role={ARIA_ROLES[variant]}
					aria-live={ARIA_ROLES[variant] === "alert" ? "assertive" : "polite"}
					className={classes}
					{...rest}
				>
					<span className="custom-message-area__icon" aria-hidden="true">
						{ICONS[variant]}
					</span>
					<span className="custom-message-area__content">{children}</span>
				</div>

				<style jsx>{`
					.custom-message-area {
						display: flex;
						align-items: flex-start;
						gap: 0.625rem;
						padding: 0.75rem 1rem;
						border-radius: 0.5rem;
						border: 1px solid transparent;
						font-size: 0.875rem;
						line-height: 1.55;
					}

					.custom-message-area__icon {
						flex-shrink: 0;
						font-size: 0.9375rem;
						line-height: 1.55;
						font-weight: 700;
					}

					.custom-message-area__content {
						flex: 1;
						min-width: 0;
					}

					.custom-message-area--banner {
						position: sticky;
						top: 0;
						z-index: 50;
						width: 100%;
						border-radius: 0;
						border-left: none;
						border-right: none;
						border-top: none;
					}

					.custom-message-area--info {
						background-color: color-mix(in srgb, #3b82f6 10%, transparent);
						border-color: color-mix(in srgb, #3b82f6 35%, transparent);
						color: #1d4ed8;
					}

					.custom-message-area--success {
						background-color: color-mix(in srgb, #22c55e 10%, transparent);
						border-color: color-mix(in srgb, #22c55e 35%, transparent);
						color: #15803d;
					}

					.custom-message-area--warning {
						background-color: color-mix(in srgb, #f59e0b 10%, transparent);
						border-color: color-mix(in srgb, #f59e0b 35%, transparent);
						color: #92400e;
					}

					.custom-message-area--error {
						background-color: color-mix(in srgb, #ef4444 10%, transparent);
						border-color: color-mix(in srgb, #ef4444 35%, transparent);
						color: #b91c1c;
					}
				`}</style>
			</>
		);
	}
);

CustomMessageArea.displayName = "CustomMessageArea";

export default CustomMessageArea;


