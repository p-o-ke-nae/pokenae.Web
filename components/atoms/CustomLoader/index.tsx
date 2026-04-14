'use client';

import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import resources from "@/lib/resources";type Size = "sm" | "md" | "lg";
type Variant = "normal" | "bold";

export type CustomLoaderProps = HTMLAttributes<HTMLSpanElement> & {
	size?: Size;
	variant?: Variant;
	label?: string;
};

const CustomLoader = forwardRef<HTMLSpanElement, CustomLoaderProps>(
	({ size = "md", variant = "normal", label = resources.loader.label, className = "", ...rest }, ref) => {
		const classes = ["custom-loader", `custom-loader--${size}`, `custom-loader--${variant}`, className]
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
					<span className="custom-loader__ring" aria-hidden="true" />
					<span className="custom-loader__dot" aria-hidden="true" />
				</span>

				<style jsx>{`
					.custom-loader {
						display: inline-flex;
						align-items: center;
						justify-content: center;
						position: relative;
						cursor: default;
						user-select: none;
					}

					.custom-loader__ring {
						display: block;
						border-radius: 50%;
						border-style: solid;
						border-color: var(--color-base-70-dark);
						border-top-color: var(--color-accent-25);
						border-right-color: color-mix(in srgb, var(--color-accent-25) 50%, var(--color-base-70-dark));
						animation: custom-loader-spin 0.75s cubic-bezier(0.4, 0, 0.6, 1) infinite;
					}

					.custom-loader__dot {
						display: block;
						position: absolute;
						border-radius: 50%;
						background-color: var(--color-accent-25);
						animation: custom-loader-pulse 0.75s cubic-bezier(0.4, 0, 0.6, 1) infinite alternate;
					}

					.custom-loader--sm .custom-loader__ring {
						width: 1.125rem;
						height: 1.125rem;
						border-width: 2px;
					}

					.custom-loader--sm .custom-loader__dot {
						width: 0.3rem;
						height: 0.3rem;
					}

					.custom-loader--md .custom-loader__ring {
						width: 1.75rem;
						height: 1.75rem;
						border-width: 2.5px;
					}

					.custom-loader--md .custom-loader__dot {
						width: 0.4rem;
						height: 0.4rem;
					}

					.custom-loader--lg .custom-loader__ring {
						width: 2.75rem;
						height: 2.75rem;
						border-width: 3px;
					}

					.custom-loader--lg .custom-loader__dot {
						width: 0.55rem;
						height: 0.55rem;
					}

					/* Bold variant — thicker ring, stronger accent */
					.custom-loader--bold .custom-loader__ring {
						border-color: color-mix(in srgb, var(--color-accent-25) 20%, transparent);
						border-top-color: var(--color-accent-25-strong);
						border-right-color: var(--color-accent-25);
					}

					.custom-loader--bold.custom-loader--sm .custom-loader__ring {
						border-width: 4px;
					}

					.custom-loader--bold.custom-loader--md .custom-loader__ring {
						border-width: 6px;
					}

					.custom-loader--bold.custom-loader--lg .custom-loader__ring {
						border-width: 8px;
					}

					.custom-loader--bold .custom-loader__dot {
						background-color: var(--color-accent-25-strong);
						box-shadow: 0 0 6px var(--color-accent-25);
					}

					@keyframes custom-loader-spin {
						to {
							transform: rotate(360deg);
						}
					}

					@keyframes custom-loader-pulse {
						from {
							opacity: 0.4;
							transform: scale(0.75);
						}
						to {
							opacity: 1;
							transform: scale(1);
						}
					}
				`}</style>
			</>
		);
	}
);

CustomLoader.displayName = "CustomLoader";

export default CustomLoader;

