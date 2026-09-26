'use client';

import type { HTMLAttributes } from "react";

type Level = 1 | 2 | 3 | 4 | 5 | 6;

export type CustomHeaderProps = HTMLAttributes<HTMLHeadingElement> & {
	level?: Level;
	variant?: "title" | "section" | "subtle" | "plain";
};

export default function CustomHeader({
	level = 1,
	variant = level === 1 ? "title" : "section",
	className = "",
	children,
	...rest
}: CustomHeaderProps) {
		const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
		const classes = ["custom-header", `custom-header--level-${level}`, `custom-header--${variant}`, className]
			.filter(Boolean)
			.join(" ");

		return (
			<>
				<Tag className={classes} {...rest}>
					{children}
				</Tag>

				<style jsx>{`
					.custom-header {
						font-weight: 700;
						color: var(--color-text-strong);
						line-height: 1.35;
						letter-spacing: 0.01em;
						margin: 0;
					}
					.custom-header--level-1 { font-size: clamp(1.8rem, 4vw, 2.45rem); }
					.custom-header--level-2 { font-size: 1.45rem; }
					.custom-header--level-3 { font-size: 1.2rem; }
					.custom-header--level-4 { font-size: 1.05rem; }
					.custom-header--level-5 { font-size: .95rem; }
					.custom-header--level-6 { font-size: .85rem; }
					.custom-header--title {
						padding: .45rem .75rem;
						border-left: 8px solid var(--color-accent-25);
						border-bottom: 1px solid var(--color-base-70-dark);
						background: linear-gradient(90deg, var(--color-accent-25-light), #fff 72%);
					}
					.custom-header--section {
						padding-bottom: 0.35rem;
						border-bottom: 2px solid var(--color-accent-25);
					}
					.custom-header--subtle {
						padding-left: .55rem;
						border-left: 4px solid var(--color-accent-25);
						font-size: 1rem;
					}
				`}</style>
			</>
		);
}
