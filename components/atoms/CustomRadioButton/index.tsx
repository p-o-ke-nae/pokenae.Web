'use client';

import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

export type CustomRadioButtonProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

const CustomRadioButton = forwardRef<HTMLInputElement, CustomRadioButtonProps>(
	({ className = "", ...rest }, ref) => {
		const classes = ["custom-radio", className].filter(Boolean).join(" ");

		return (
			<>
				<input ref={ref} type="radio" className={classes} {...rest} />

				<style jsx>{`
					.custom-radio {
						appearance: none;
						-webkit-appearance: none;
						display: inline-block;
						width: 1.125rem;
						height: 1.125rem;
						flex-shrink: 0;
						border-radius: 50%;
						border: 1.5px solid var(--color-base-70-dark);
						background-color: var(--color-base-70-light);
						cursor: pointer;
						transition:
							border-color 120ms ease,
							background-color 120ms ease,
							box-shadow 120ms ease;
						vertical-align: middle;
					}

					.custom-radio:hover:not(:disabled) {
						border-color: var(--color-accent-25);
						box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent-25) 15%, transparent);
					}

					.custom-radio:focus-visible {
						outline: 2px solid var(--color-accent-25);
						outline-offset: 2px;
					}

					.custom-radio:checked {
						border-color: var(--color-accent-25-strong);
						border-width: 2px;
						background-image: radial-gradient(
							circle,
							var(--color-accent-25) 42%,
							transparent 42%
						);
					}

					.custom-radio:disabled {
						opacity: 0.5;
						cursor: not-allowed;
					}
				`}</style>
			</>
		);
	}
);

CustomRadioButton.displayName = "CustomRadioButton";

export default CustomRadioButton;

