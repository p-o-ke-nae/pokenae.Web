'use client';

import { forwardRef } from "react";
import type { LabelHTMLAttributes } from "react";

export type CustomLabelProps = LabelHTMLAttributes<HTMLLabelElement> & {
	required?: boolean;
};

const CustomLabel = forwardRef<HTMLLabelElement, CustomLabelProps>(
	({ required = false, className = "", children, ...rest }, ref) => {
		const classes = ["custom-label", className].filter(Boolean).join(" ");

		return (
			<>
				<label ref={ref} className={classes} {...rest}>
					{children}
					{required && (
						<span className="custom-label__required" aria-hidden="true">
							*
						</span>
					)}
				</label>

				<style jsx>{`
					.custom-label {
						display: inline-flex;
						align-items: center;
						gap: 0.25rem;
						font-size: 0.8125rem;
						font-weight: 600;
						color: var(--color-text-strong);
						line-height: 1.4;
						letter-spacing: 0.01em;
					}

					.custom-label__required {
						color: var(--color-accent-25-strong);
						font-size: 0.875rem;
						font-weight: 700;
						margin-left: 0.1rem;
						line-height: 1;
					}
				`}</style>
			</>
		);
	}
);

CustomLabel.displayName = "CustomLabel";

export default CustomLabel;

