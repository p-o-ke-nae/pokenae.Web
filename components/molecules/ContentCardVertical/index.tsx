'use client';

import Image from 'next/image';
import Link from 'next/link';
import { formatContentDate } from '@/lib/content/presentation';

type ContentCardMetadata =
	| { publishedAt: string; metaLabel?: never }
	| { publishedAt?: never; metaLabel: string };

export type ContentCardVerticalProps = {
	id: string;
	title: string;
	imageSrc: string;
	imageAlt: string;
	href: string;
	tag?: string;
} & ContentCardMetadata;

export default function ContentCardVertical({
	title,
	publishedAt,
	metaLabel,
	imageSrc,
	imageAlt,
	href,
	tag,
}: ContentCardVerticalProps) {
	return (
		<>
			<Link href={href} className="card-v">
				<div className="card-v__image-wrap">
					<Image
						src={imageSrc}
						alt={imageAlt}
						fill
						unoptimized
						sizes="(max-width: 768px) 50vw, 300px"
						style={{ objectFit: 'cover' }}
					/>
					{tag && <span className="card-v__tag">{tag}</span>}
				</div>
				<div className="card-v__body">
					<h3 className="card-v__title">{title}</h3>
					{publishedAt
						? <time className="card-v__meta" dateTime={publishedAt}>{formatContentDate(publishedAt)}</time>
						: <span className="card-v__meta">{metaLabel}</span>}
				</div>
			</Link>

			<style jsx global>{`
				.card-v {
					display: flex;
					flex-direction: column;
					background: var(--background);
					border: 1px solid var(--color-base-70);
					overflow: hidden;
					text-decoration: none;
					transition:
						box-shadow 0.2s ease,
						transform 0.2s ease;
				}

				.card-v:focus-visible {
					border-color: var(--color-accent-25-strong);
					box-shadow: 0 6px 18px rgba(121, 85, 118, 0.28);
					transform: translateY(-2px);
				}
				.card-v:focus-visible .card-v__title { color: var(--color-accent-25-strong); }
				@media (hover: hover) {
					.card-v:hover {
						border-color: var(--color-accent-25-strong);
						box-shadow: 0 6px 18px rgba(121, 85, 118, 0.28);
						transform: translateY(-2px);
					}
					.card-v:hover .card-v__title { color: var(--color-accent-25-strong); }
				}

				.card-v__image-wrap {
					position: relative;
					width: 100%;
					aspect-ratio: 4 / 3;
					background: var(--color-base-70);
					overflow: hidden;
				}

				.card-v__tag {
					position: absolute;
					bottom: 0.5rem;
					left: 0.5rem;
					background: var(--color-accent-25);
					color: var(--color-text-inverse);
					font-size: 0.75rem;
					font-weight: 700;
					padding: 0.2rem 0.5rem;
					border-radius: 0.2rem;
				}

				.card-v__body {
					padding: 0.875rem 1rem;
					display: flex;
					flex-direction: column;
					gap: 0.5rem;
				}

				.card-v__title {
					font-size: 0.95rem;
					font-weight: 600;
					color: var(--color-text-strong);
					line-height: 1.5;
				}

				.card-v__meta {
					font-size: 0.75rem;
					color: var(--foreground);
					opacity: 0.5;
					text-align: right;
				}
			`}</style>
		</>
	);
}
