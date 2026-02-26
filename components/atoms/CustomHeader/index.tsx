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
						line-height: 1.3;
					}

					.custom-header--level-1 {
						font-size: 2rem;
					}

					.custom-header--level-2 {
						font-size: 1.5rem;
					}

					.custom-header--level-3 {
						font-size: 1.25rem;
					}

					.custom-header--level-4 {
						font-size: 1.125rem;
					}

					.custom-header--level-5 {
						font-size: 1rem;
					}

					.custom-header--level-6 {
						font-size: 0.875rem;
					}
				`}</style>
			</>
		);
	}
);

CustomHeader.displayName = "CustomHeader";

export default CustomHeader;
