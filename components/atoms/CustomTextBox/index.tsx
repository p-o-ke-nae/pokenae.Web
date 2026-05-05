'use client';

import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

export type CustomTextBoxProps = InputHTMLAttributes<HTMLInputElement> & {
	isError?: boolean;
	displayOnly?: boolean;
};

const CustomTextBox = forwardRef<HTMLInputElement, CustomTextBoxProps>(
	({ isError = false, displayOnly = false, className = "", ...rest }, ref) => {
		const classes = [
			"custom-textbox",
			isError ? "custom-textbox--error" : "",
			displayOnly ? "custom-textbox--display-only" : "",
			className,
		]
			.filter(Boolean)
			.join(" ");

		return (
			<>
				<input
					ref={ref}
					className={classes}
					aria-invalid={isError}
					{...rest}
					{...(displayOnly ? { readOnly: true, tabIndex: -1, "aria-readonly": true } : {})}
				/>

				<style jsx>{`
					.custom-textbox {
						display: block;
						width: 100%;
						padding: 0.5625rem 0.875rem;
						border-radius: 0.5rem;
						border: 1.5px solid var(--color-base-70-dark);
						background-color: var(--color-base-70-light);
						color: var(--color-text-strong);
						font-size: 0.875rem;
						line-height: 1.5;
						cursor: text;
						transition:
							border-color 140ms ease,
							box-shadow 140ms ease,
							background-color 140ms ease;
					}

					.custom-textbox::placeholder {
						color: color-mix(in srgb, var(--color-text-strong) 35%, transparent);
					}

					.custom-textbox:hover:not(:disabled):not(:focus-visible) {
						border-color: color-mix(in srgb, var(--color-accent-25) 50%, var(--color-base-70-dark));
					}

					.custom-textbox:focus-visible {
						outline: none;
						border-color: var(--color-accent-25);
						background-color: color-mix(in srgb, var(--color-accent-25) 4%, var(--color-base-70-light));
						box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent-25) 20%, transparent);
					}

					.custom-textbox:read-only {
						cursor: default;
						caret-color: transparent;
					}

					.custom-textbox--display-only {
						cursor: default;
						caret-color: transparent;
						pointer-events: none;
						user-select: text;
					}

					.custom-textbox--error {
						border-color: #c0392b;
						background-color: color-mix(in srgb, #e74c3c 5%, var(--color-base-70-light));
					}

					.custom-textbox--error:focus-visible {
						border-color: #c0392b;
						box-shadow: 0 0 0 3px rgba(192, 57, 43, 0.2);
					}

					.custom-textbox:disabled {
						opacity: 0.55;
						cursor: not-allowed;
						background-color: var(--color-base-70);
					}
				`}</style>
			</>
		);
	}
);

CustomTextBox.displayName = "CustomTextBox";

export default CustomTextBox;

