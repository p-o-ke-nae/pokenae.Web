'use client';

import Image from 'next/image';
import Link from 'next/link';
import { formatContentDate } from '@/lib/content/presentation';

type ContentCardMetadata =
	| { publishedAt: string; metaLabel?: never }
	| { publishedAt?: never; metaLabel: string };

export type ContentCardHorizontalProps = {
	id: string;
	title: string;
	description: string;
	imageSrc: string;
	imageAlt: string;
	href: string;
	variant?: 'default' | 'compact';
	descriptionLines?: 2 | 3;
} & ContentCardMetadata;

export default function ContentCardHorizontal({
	title,
	description,
	publishedAt,
	metaLabel,
	imageSrc,
	imageAlt,
	href,
	variant = 'default',
	descriptionLines = 2,
}: ContentCardHorizontalProps) {
	return (
		<>
			<Link href={href} className={`card-h card-h--${variant}${descriptionLines === 3 ? ' card-h--description-3' : ''}`}>
				<div className="card-h__image-wrap">
					<Image
						src={imageSrc}
						alt={imageAlt}
						fill
						unoptimized
						sizes="(max-width: 768px) 30vw, 200px"
						style={{ objectFit: 'cover' }}
					/>
				</div>
				<div className="card-h__body">
					<h3 className="card-h__title">{title}</h3>
					<p className="card-h__description">{description}</p>
					{publishedAt
						? <time className="card-h__meta" dateTime={publishedAt}>{formatContentDate(publishedAt)}</time>
						: <span className="card-h__meta">{metaLabel}</span>}
				</div>
			</Link>

		<style jsx global>{`
			.card-h {
				display: flex;
				flex-direction: row;
				background: var(--background);
				border: 2px solid var(--color-base-70-dark);
				text-decoration: none;
				overflow: hidden;
				transition:
					box-shadow 0.2s ease,
					transform 0.2s ease;
			}

			.card-h:focus-visible {
				border-color: var(--color-accent-25-strong);
				box-shadow: 0 6px 18px rgba(121, 85, 118, 0.28);
				transform: translateY(-2px);
			}
			.card-h:focus-visible .card-h__title { color: var(--color-accent-25-strong); }
			@media (hover: hover) {
				.card-h:hover {
					border-color: var(--color-accent-25-strong);
					box-shadow: 0 6px 18px rgba(121, 85, 118, 0.28);
					transform: translateY(-2px);
				}
				.card-h:hover .card-h__title { color: var(--color-accent-25-strong); }
			}

			.card-h__image-wrap {
				position: relative;
				flex: 0 0 36%;
				min-height: 150px;
				background: var(--color-base-70);
				overflow: hidden;
			}

			.card-h__body {
				flex: 1;
				display: flex;
				flex-direction: column;
				gap: 0.5rem;
				padding: 1rem;
				min-width: 0;
				overflow: hidden;
			}

			.card-h__title {
				margin: 0;
				font-size: 1rem;
				font-weight: 700;
				color: var(--color-text-strong);
				line-height: 1.4;
				display: -webkit-box;
				-webkit-line-clamp: 2;
				-webkit-box-orient: vertical;
				overflow: hidden;
			}

			.card-h__description {
				margin: 0;
				font-size: 0.875rem;
				color: var(--foreground);
				opacity: 0.8;
				line-height: 1.6;
				display: -webkit-box;
				-webkit-line-clamp: 2;
				-webkit-box-orient: vertical;
				overflow: hidden;
			}

			.card-h__meta {
				font-size: 0.8rem;
				color: var(--foreground);
				opacity: 0.5;
				margin-top: auto;
				white-space: nowrap;
			}
			.card-h--description-3 .card-h__image-wrap { flex-basis: 30%; min-height: 120px; }
			.card-h--description-3 .card-h__description { -webkit-line-clamp: 3; }
			.card-h--compact .card-h__image-wrap { flex-basis: 38%; min-height: 96px; }
			.card-h--compact .card-h__body { gap: .25rem; padding: .6rem; }
			.card-h--compact .card-h__title { font-size: .85rem; -webkit-line-clamp: 2; }
			.card-h--compact .card-h__description { font-size: .75rem; line-height: 1.4; -webkit-line-clamp: 1; }
			.card-h--compact .card-h__meta { font-size: .7rem; margin-top: 0; }

			@media(max-width:560px) {
				.card-h { flex-direction:column; }
				.card-h__image-wrap {
					flex-basis:auto;
					width:100%;
					height:clamp(7rem, 38vw, 9rem);
					min-height:0;
				}
				.card-h__body { gap:.35rem; padding:.75rem; }
				.card-h--description-3 .card-h__image-wrap {
					flex-basis:auto;
					height:clamp(5.5rem, 28vw, 7rem);
					min-height:0;
				}
				.card-h--compact .card-h__image-wrap {
					flex-basis:auto;
					height:clamp(6rem, 32vw, 7.5rem);
					min-height:0;
				}
				.card-h--compact .card-h__body { gap:.25rem; padding:.6rem; }
			}
		`}</style>
		</>
	);
}
