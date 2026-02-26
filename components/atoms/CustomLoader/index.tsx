'use client';

import { forwardRef } from "react";
import type { HTMLAttributes } from "react";

type Size = "sm" | "md" | "lg";

export type CustomLoaderProps = HTMLAttributes<HTMLSpanElement> & {
	size?: Size;
	label?: string;
};

const CustomLoader = forwardRef<HTMLSpanElement, CustomLoaderProps>(
	({ size = "md", label = "読み込み中...", className = "", ...rest }, ref) => {
		const classes = ["custom-loader", `custom-loader--${size}`, className]
			.filter(Boolean)
			.join(" ");

		return (
			<>
				<span
					ref={ref}
					role="status"
					aria-label={label}
					className={classes}
					{...rest}
				>
					<span className="custom-loader__spinner" aria-hidden="true" />
				</span>

				<style jsx>{`
					.custom-loader {
						display: inline-flex;
						align-items: center;
						justify-content: center;
					}

					.custom-loader__spinner {
						display: block;
						border-radius: 50%;
						border: 2px solid var(--color-base-70-dark);
						border-top-color: var(--color-accent-25);
						animation: custom-loader-spin 0.7s linear infinite;
					}

					.custom-loader--sm .custom-loader__spinner {
						width: 1rem;
						height: 1rem;
					}

					.custom-loader--md .custom-loader__spinner {
						width: 1.5rem;
						height: 1.5rem;
					}

					.custom-loader--lg .custom-loader__spinner {
						width: 2.5rem;
						height: 2.5rem;
						border-width: 3px;
					}

					@keyframes custom-loader-spin {
						to {
							transform: rotate(360deg);
						}
					}
				`}</style>
			</>
		);
	}
);

CustomLoader.displayName = "CustomLoader";

export default CustomLoader;
