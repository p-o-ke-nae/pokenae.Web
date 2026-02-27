'use client';

import { forwardRef } from "react";
import type { SelectHTMLAttributes, ReactNode } from "react";

export type CustomComboBoxProps = SelectHTMLAttributes<HTMLSelectElement> & {
	isError?: boolean;
	placeholder?: string;
	children?: ReactNode;
};

const CustomComboBox = forwardRef<HTMLSelectElement, CustomComboBoxProps>(
	({ isError = false, placeholder, className = "", children, ...rest }, ref) => {
		const classes = [
			"custom-combobox",
			isError ? "custom-combobox--error" : "",
			className,
		]
			.filter(Boolean)
			.join(" ");

		return (
			<>
				<div className="custom-combobox__wrapper">
					<select ref={ref} className={classes} aria-invalid={isError} {...rest}>
						{placeholder && (
							<option value="" disabled hidden>
								{placeholder}
							</option>
						)}
						{children}
					</select>
					<span className="custom-combobox__arrow" aria-hidden="true">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="12"
							height="12"
							viewBox="0 0 12 12"
							fill="none"
						>
							<path
								d="M2 4l4 4 4-4"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</span>
				</div>

				<style jsx>{`
					.custom-combobox__wrapper {
						position: relative;
						display: block;
						width: 100%;
					}

					.custom-combobox {
						display: block;
						width: 100%;
						padding: 0.5625rem 2.25rem 0.5625rem 0.875rem;
						border-radius: 0.5rem;
						border: 1.5px solid var(--color-base-70-dark);
						background-color: var(--color-base-70-light);
						color: var(--color-text-strong);
						font-size: 0.875rem;
						line-height: 1.5;
						appearance: none;
						-webkit-appearance: none;
						cursor: pointer;
						transition:
							border-color 140ms ease,
							box-shadow 140ms ease,
							background-color 140ms ease;
					}

					.custom-combobox:hover:not(:disabled) {
						border-color: color-mix(in srgb, var(--color-accent-25) 50%, var(--color-base-70-dark));
					}

					.custom-combobox:focus-visible {
						outline: none;
						border-color: var(--color-accent-25);
						background-color: color-mix(in srgb, var(--color-accent-25) 4%, var(--color-base-70-light));
						box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent-25) 20%, transparent);
					}

					.custom-combobox--error {
						border-color: #c0392b;
						background-color: color-mix(in srgb, #e74c3c 5%, var(--color-base-70-light));
					}

					.custom-combobox--error:focus-visible {
						border-color: #c0392b;
						box-shadow: 0 0 0 3px rgba(192, 57, 43, 0.2);
					}

					.custom-combobox:disabled {
						opacity: 0.55;
						cursor: not-allowed;
						background-color: var(--color-base-70);
					}

					.custom-combobox__arrow {
						position: absolute;
						right: 0.75rem;
						top: 50%;
						transform: translateY(-50%);
						pointer-events: none;
						color: color-mix(in srgb, var(--color-text-strong) 60%, transparent);
						display: flex;
						align-items: center;
					}

					.custom-combobox:focus-visible ~ .custom-combobox__arrow {
						color: var(--color-accent-25);
					}
				`}</style>
			</>
		);
	}
);

CustomComboBox.displayName = "CustomComboBox";

export default CustomComboBox;
