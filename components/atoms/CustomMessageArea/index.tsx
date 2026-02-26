'use client';

import { forwardRef } from "react";
import type { TextareaHTMLAttributes } from "react";

export type CustomMessageAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
	isError?: boolean;
};

const CustomMessageArea = forwardRef<HTMLTextAreaElement, CustomMessageAreaProps>(
	({ isError = false, className = "", ...rest }, ref) => {
		const classes = [
			"custom-message-area",
			isError ? "custom-message-area--error" : "",
			className,
		]
			.filter(Boolean)
			.join(" ");

		return (
			<>
				<textarea ref={ref} className={classes} aria-invalid={isError} {...rest} />

				<style jsx>{`
					.custom-message-area {
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
						transition:
							border-color 140ms ease,
							box-shadow 140ms ease,
							background-color 140ms ease;
					}

					.custom-message-area::placeholder {
						color: color-mix(in srgb, var(--color-text-strong) 35%, transparent);
					}

					.custom-message-area:hover:not(:disabled):not(:focus-visible) {
						border-color: color-mix(in srgb, var(--color-accent-25) 50%, var(--color-base-70-dark));
					}

					.custom-message-area:focus-visible {
						outline: none;
						border-color: var(--color-accent-25);
						background-color: color-mix(in srgb, var(--color-accent-25) 4%, var(--color-base-70-light));
						box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent-25) 20%, transparent);
					}

					.custom-message-area--error {
						border-color: #c0392b;
						background-color: color-mix(in srgb, #e74c3c 5%, var(--color-base-70-light));
					}

					.custom-message-area--error:focus-visible {
						border-color: #c0392b;
						box-shadow: 0 0 0 3px rgba(192, 57, 43, 0.2);
					}

					.custom-message-area:disabled {
						opacity: 0.55;
						cursor: not-allowed;
						background-color: var(--color-base-70);
					}
				`}</style>
			</>
		);
	}
);

CustomMessageArea.displayName = "CustomMessageArea";

export default CustomMessageArea;

