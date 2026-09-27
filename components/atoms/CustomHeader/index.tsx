'use client';

import type { HTMLAttributes } from "react";

type Level = 1 | 2 | 3 | 4 | 5 | 6;

export type CustomHeaderProps = HTMLAttributes<HTMLHeadingElement> & {
	level?: Level;
	variant?: "title" | "home" | "section" | "subtle" | "plain";
	context?: "default" | "prose";
};

export default function CustomHeader({
	level = 1,
	variant = level === 1 ? "title" : "section",
	context = "default",
	className = "",
	children,
	...rest
}: CustomHeaderProps) {
		const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
		const classes = ["custom-header", `custom-header--level-${level}`, `custom-header--${variant}`, `custom-header--${context}`, className]
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
						line-height: 1.25;
						letter-spacing: 0.01em;
						margin: 0;
					}
					.custom-header--level-1 { font-size: clamp(1.65rem, 3vw, 1.875rem); }
					.custom-header--level-2 { font-size: clamp(1.45rem, 3.2vw, 2.1875rem); }
					.custom-header--level-3 { font-size: clamp(1.25rem, 2.4vw, 1.55rem); }
					.custom-header--level-4 { font-size: clamp(1.1rem, 2vw, 1.3rem); }
					.custom-header--level-5 { font-size: clamp(1rem, 1.7vw, 1.15rem); }
					.custom-header--level-6 { font-size: clamp(.95rem, 1.5vw, 1.05rem); }
					.custom-header--title {
						padding: .15rem 0 .15rem .65rem;
						border-left: 9px solid var(--color-text-strong);
						background: #fff;
					}
					.custom-header--home {
						padding: .1rem .5rem .2rem;
						border-bottom: 4px solid #fff;
						font-size: clamp(2.25rem, 6vw, 3.75rem);
						line-height: 1;
					}
					.custom-header--section {
						padding: 0 .25rem .3rem .55rem;
						border-left: 4px solid var(--color-text-strong);
						border-bottom: 2px solid var(--color-base-70-dark);
					}
					.custom-header--subtle {
						padding: 0 .25rem .25rem .5rem;
						border-left: 4px solid var(--color-text-strong);
						border-bottom: 2px solid var(--color-base-70-dark);
						font-size: 1rem;
					}
					.custom-header--plain { padding: 0; border: 0; background: transparent; }
					.custom-header--prose {
						margin-block-start: clamp(2.25rem, 5vw, 3.25rem);
						margin-block-end: clamp(.65rem, 1.5vw, 1rem);
					}
					.custom-header--prose.custom-header--level-4,
					.custom-header--prose.custom-header--level-5,
					.custom-header--prose.custom-header--level-6 {
						margin-block-start: clamp(1.75rem, 4vw, 2.5rem);
					}
					.custom-header--prose:first-child { margin-block-start: 0; }
				`}</style>
			</>
		);
}
