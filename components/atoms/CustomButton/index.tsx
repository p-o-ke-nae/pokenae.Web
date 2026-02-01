'use client';

import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "neutral" | "accent" | "ghost";

export type CustomButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: Variant;
	isLoading?: boolean;
	icon?: ReactNode;
	iconPosition?: "left" | "right";
};

const CustomButton = forwardRef<HTMLButtonElement, CustomButtonProps>(
	({
		variant = "neutral",
		isLoading = false,
		disabled,
		icon,
		iconPosition = "left",
		className = "",
		children,
		...rest
	}, ref) => {
		const computedDisabled = disabled || isLoading;
		const classes = [
			"custom-button",
			`custom-button--${variant}`,
			computedDisabled ? "custom-button--disabled" : "",
			className,
		]
			.filter(Boolean)
			.join(" ");

		return (
			<>
				<button
					ref={ref}
					className={classes}
					disabled={computedDisabled}
					aria-busy={isLoading}
					{...rest}
				>
					{icon && iconPosition === "left" ? (
						<span className="custom-button__icon" aria-hidden="true">
							{icon}
						</span>
					) : null}
					<span className="custom-button__label">
						{isLoading ? "Loading..." : children}
					</span>
					{icon && iconPosition === "right" ? (
						<span className="custom-button__icon" aria-hidden="true">
							{icon}
						</span>
					) : null}
				</button>

				<style jsx>{`
					.custom-button {
						display: inline-flex;
						align-items: center;
						justify-content: center;
						gap: 0.5rem;
						border-radius: 0.5rem;
						padding: 0.55rem 1.5rem;
						border: 1px solid transparent;
						font-weight: 600;
						font-size: 0.95rem;
						line-height: 1.3;
						transition:
							transform 120ms ease,
							box-shadow 120ms ease,
							background-color 120ms ease,
							color 120ms ease;
						cursor: pointer;
					}

					.custom-button:focus-visible {
						outline: 2px solid var(--color-accent-25);
						outline-offset: 3px;
					}

					.custom-button--neutral {
						background-color: var(--color-base-70);
						color: var(--color-text-strong);
						border-color: var(--color-base-70-dark);
						box-shadow: 0 4px 12px rgba(31, 31, 42, 0.08);
					}

					.custom-button--accent {
						background-color: var(--color-accent-25);
						color: var(--color-text-inverse);
						border-color: var(--color-accent-25-strong);
						box-shadow: 0 4px 18px rgba(170, 133, 167, 0.35);
					}

					.custom-button--ghost {
						background-color: transparent;
						color: var(--color-accent-25);
						border-color: var(--color-base-70-dark);
					}

					.custom-button:not(.custom-button--disabled):hover {
						transform: translateY(-1px);
					}

					.custom-button--neutral:not(.custom-button--disabled):hover {
						background-color: var(--color-base-70-light);
					}

					.custom-button--accent:not(.custom-button--disabled):hover {
						background-color: var(--color-accent-25-light);
					}

					.custom-button--ghost:not(.custom-button--disabled):hover {
						background-color: color-mix(in srgb, var(--color-base-70) 60%, transparent);
					}

					.custom-button--disabled {
						opacity: 0.65;
						cursor: not-allowed;
						box-shadow: none;
					}

					.custom-button__label {
						display: inline-flex;
						align-items: center;
						justify-content: center;
					}

					.custom-button__icon {
						display: inline-flex;
					}
				`}</style>
			</>
		);
	}
);

CustomButton.displayName = "CustomButton";

export default CustomButton;
