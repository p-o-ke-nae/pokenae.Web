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
						padding: 0.5rem 0.75rem;
						border-radius: 0.5rem;
						border: 1.5px solid var(--color-base-70-dark);
						background-color: var(--color-base-70-light);
						color: var(--color-text-strong);
						font-size: 0.875rem;
						line-height: 1.5;
						resize: vertical;
						min-height: 6rem;
						transition: border-color 120ms ease, box-shadow 120ms ease;
					}

					.custom-message-area::placeholder {
						color: color-mix(in srgb, var(--color-text-strong) 40%, transparent);
					}

					.custom-message-area:focus-visible {
						outline: none;
						border-color: var(--color-accent-25);
						box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent-25) 25%, transparent);
					}

					.custom-message-area--error {
						border-color: #e53e3e;
					}

					.custom-message-area--error:focus-visible {
						box-shadow: 0 0 0 3px rgba(229, 62, 62, 0.25);
					}

					.custom-message-area:disabled {
						opacity: 0.65;
						cursor: not-allowed;
					}
				`}</style>
			</>
		);
	}
);

CustomMessageArea.displayName = "CustomMessageArea";

export default CustomMessageArea;
