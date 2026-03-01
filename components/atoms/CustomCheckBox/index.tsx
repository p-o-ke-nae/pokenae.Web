'use client';

import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

export type CustomCheckBoxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

const CustomCheckBox = forwardRef<HTMLInputElement, CustomCheckBoxProps>(
	({ className = "", ...rest }, ref) => {
		const classes = ["custom-checkbox", className].filter(Boolean).join(" ");

		return (
			<>
				<input ref={ref} type="checkbox" className={classes} {...rest} />

				<style jsx>{`
					.custom-checkbox {
						appearance: none;
						-webkit-appearance: none;
						display: inline-block;
						width: 1.125rem;
						height: 1.125rem;
						flex-shrink: 0;
						border-radius: 0.3125rem;
						border: 1.5px solid var(--color-base-70-dark);
						background-color: var(--color-base-70-light);
						cursor: pointer;
						transition:
							border-color 120ms ease,
							background-color 120ms ease,
							box-shadow 120ms ease;
						vertical-align: middle;
					}

					.custom-checkbox:hover:not(:disabled) {
						border-color: var(--color-accent-25);
						box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent-25) 15%, transparent);
					}

					.custom-checkbox:focus-visible {
						outline: 2px solid var(--color-accent-25);
						outline-offset: 2px;
					}

					.custom-checkbox:checked {
						background-color: var(--color-accent-25);
						border-color: var(--color-accent-25-strong);
						background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M2 6l3 3 5-5' stroke='%23fffafb' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
						background-size: 100% 100%;
						background-position: center;
						background-repeat: no-repeat;
					}

					.custom-checkbox:checked:hover:not(:disabled) {
						background-color: var(--color-accent-25-light);
					}

					.custom-checkbox:disabled {
						opacity: 0.5;
						cursor: not-allowed;
					}
				`}</style>
			</>
		);
	}
);

CustomCheckBox.displayName = "CustomCheckBox";

export default CustomCheckBox;

