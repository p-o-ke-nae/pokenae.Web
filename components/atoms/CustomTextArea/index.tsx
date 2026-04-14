'use client';

import { forwardRef } from "react";
import type { TextareaHTMLAttributes } from "react";

export type CustomTextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
	isError?: boolean;
	displayOnly?: boolean;
};

const CustomTextArea = forwardRef<HTMLTextAreaElement, CustomTextAreaProps>(
	({ isError = false, displayOnly = false, className = "", ...rest }, ref) => {
		const classes = [
			"custom-textarea",
			isError ? "custom-textarea--error" : "",
			displayOnly ? "custom-textarea--display-only" : "",
			className,
		]
			.filter(Boolean)
			.join(" ");

		return (
			<>
				<textarea
					ref={ref}
					className={classes}
					aria-invalid={isError}
					{...rest}
					{...(displayOnly ? { readOnly: true, tabIndex: -1, "aria-readonly": true } : {})}
				/>

				<style jsx>{`
					.custom-textarea {
						display: block;
						width: 100%;
						padding: 0.5625rem 0.875rem;
						border-radius: 0.5rem;
						border: 1.5px solid var(--color-base-70-dark);
						background-color: var(--color-base-70-light);
						color: var(--color-text-strong);
						font-size: 0.875rem;
						line-height: 1.65;
						resize: vertical;
						min-height: 6rem;
						cursor: text;
						transition:
							border-color 140ms ease,
							box-shadow 140ms ease,
							background-color 140ms ease;
					}

					.custom-textarea::placeholder {
						color: color-mix(in srgb, var(--color-text-strong) 35%, transparent);
					}

					.custom-textarea:hover:not(:disabled):not(:focus-visible) {
						border-color: color-mix(in srgb, var(--color-accent-25) 50%, var(--color-base-70-dark));
					}

					.custom-textarea:focus-visible {
						outline: none;
						border-color: var(--color-accent-25);
						background-color: color-mix(in srgb, var(--color-accent-25) 4%, var(--color-base-70-light));
						box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent-25) 20%, transparent);
					}

					.custom-textarea:read-only {
						cursor: default;
						caret-color: transparent;
					}

					.custom-textarea--display-only {
						cursor: default;
						caret-color: transparent;
						pointer-events: none;
						user-select: text;
						resize: none;
					}

					.custom-textarea--error {
						border-color: #c0392b;
						background-color: color-mix(in srgb, #e74c3c 5%, var(--color-base-70-light));
					}

					.custom-textarea--error:focus-visible {
						border-color: #c0392b;
						box-shadow: 0 0 0 3px rgba(192, 57, 43, 0.2);
					}

					.custom-textarea:disabled {
						opacity: 0.55;
						cursor: not-allowed;
						background-color: var(--color-base-70);
					}
				`}</style>
			</>
		);
	}
);

CustomTextArea.displayName = "CustomTextArea";

export default CustomTextArea;
