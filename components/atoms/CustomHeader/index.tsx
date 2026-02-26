'use client';

import { forwardRef } from "react";
import type { HTMLAttributes } from "react";

type Level = 1 | 2 | 3 | 4 | 5 | 6;

export type CustomHeaderProps = HTMLAttributes<HTMLHeadingElement> & {
	level?: Level;
};

const CustomHeader = forwardRef<HTMLHeadingElement, CustomHeaderProps>(
	({ level = 1, className = "", children, ...rest }, ref) => {
		const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
		const classes = ["custom-header", `custom-header--level-${level}`, className]
			.filter(Boolean)
			.join(" ");

		return (
			<>
				<Tag ref={ref} className={classes} {...rest}>
					{children}
				</Tag>

				<style jsx>{`
					.custom-header {
						font-weight: 700;
						color: var(--color-text-strong);
						line-height: 1.25;
						letter-spacing: -0.02em;
					}

					.custom-header--level-1 {
						font-size: 2.25rem;
						background: linear-gradient(
							135deg,
							var(--color-text-strong) 60%,
							var(--color-accent-25)
						);
						-webkit-background-clip: text;
						background-clip: text;
						-webkit-text-fill-color: transparent;
					}

					.custom-header--level-2 {
						font-size: 1.5rem;
						padding-bottom: 0.375rem;
						border-bottom: 2px solid var(--color-accent-25);
					}

					.custom-header--level-3 {
						font-size: 1.25rem;
						padding-left: 0.625rem;
						border-left: 3px solid var(--color-accent-25);
					}

					.custom-header--level-4 {
						font-size: 1.0625rem;
					}

					.custom-header--level-5 {
						font-size: 0.9375rem;
						color: color-mix(in srgb, var(--color-text-strong) 80%, var(--color-accent-25));
					}

					.custom-header--level-6 {
						font-size: 0.8125rem;
						font-weight: 600;
						text-transform: uppercase;
						letter-spacing: 0.06em;
						color: color-mix(in srgb, var(--color-text-strong) 60%, var(--color-accent-25));
					}
				`}</style>
			</>
		);
	}
);

CustomHeader.displayName = "CustomHeader";

export default CustomHeader;

