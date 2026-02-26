'use client';

import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

export type CustomTextBoxProps = InputHTMLAttributes<HTMLInputElement> & {
	isError?: boolean;
};

const CustomTextBox = forwardRef<HTMLInputElement, CustomTextBoxProps>(
	({ isError = false, className = "", ...rest }, ref) => {
		const classes = [
			"custom-textbox",
			isError ? "custom-textbox--error" : "",
			className,
		]
			.filter(Boolean)
			.join(" ");

		return (
			<>
				<input ref={ref} className={classes} aria-invalid={isError} {...rest} />

				<style jsx>{`
					.custom-textbox {
						display: block;
						width: 100%;
						padding: 0.5rem 0.75rem;
						border-radius: 0.5rem;
						border: 1.5px solid var(--color-base-70-dark);
						background-color: var(--color-base-70-light);
						color: var(--color-text-strong);
						font-size: 0.875rem;
						line-height: 1.5;
						transition: border-color 120ms ease, box-shadow 120ms ease;
					}

					.custom-textbox::placeholder {
						color: color-mix(in srgb, var(--color-text-strong) 40%, transparent);
					}

					.custom-textbox:focus-visible {
						outline: none;
						border-color: var(--color-accent-25);
						box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent-25) 25%, transparent);
					}

					.custom-textbox--error {
						border-color: #e53e3e;
					}

					.custom-textbox--error:focus-visible {
						box-shadow: 0 0 0 3px rgba(229, 62, 62, 0.25);
					}

					.custom-textbox:disabled {
						opacity: 0.65;
						cursor: not-allowed;
					}
				`}</style>
			</>
		);
	}
);

CustomTextBox.displayName = "CustomTextBox";

export default CustomTextBox;
