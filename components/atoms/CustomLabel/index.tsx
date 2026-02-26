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
						font-size: 0.875rem;
						font-weight: 500;
						color: var(--color-text-strong);
						line-height: 1.4;
					}

					.custom-label__required {
						color: #e53e3e;
						font-size: 0.75rem;
						margin-left: 0.125rem;
					}
				`}</style>
			</>
		);
	}
);

CustomLabel.displayName = "CustomLabel";

export default CustomLabel;
