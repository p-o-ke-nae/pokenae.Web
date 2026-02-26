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
						width: 1rem;
						height: 1rem;
						border-radius: 50%;
						border: 1.5px solid var(--color-base-70-dark);
						background-color: var(--color-base-70-light);
						accent-color: var(--color-accent-25);
						cursor: pointer;
						transition: border-color 120ms ease, box-shadow 120ms ease;
					}

					.custom-radio:focus-visible {
						outline: 2px solid var(--color-accent-25);
						outline-offset: 2px;
					}

					.custom-radio:disabled {
						opacity: 0.65;
						cursor: not-allowed;
					}
				`}</style>
			</>
		);
	}
);

CustomRadioButton.displayName = "CustomRadioButton";

export default CustomRadioButton;
