import Image from 'next/image';
import Link from 'next/link';

export type ContentCardHorizontalProps = {
	id: string;
	title: string;
	description: string;
	date: string;
	imageSrc: string;
	imageAlt: string;
	href: string;
};

export default function ContentCardHorizontal({
	title,
	description,
	date,
	imageSrc,
	imageAlt,
	href,
}: ContentCardHorizontalProps) {
	return (
		<>
			<Link href={href} className="card-h">
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
					<time className="card-h__date" dateTime={date}>
						{date}
					</time>
				</div>
			</Link>

			<style jsx>{`
				.card-h {
					display: flex;
					gap: 1.25rem;
					padding: 1.25rem;
					background: var(--background);
					border: 1px solid var(--color-base-70);
					border-left: 4px solid var(--color-accent-25);
					border-radius: 0.5rem;
					text-decoration: none;
					transition:
						box-shadow 0.2s ease,
						transform 0.2s ease;
				}

				.card-h:hover {
					box-shadow: 0 4px 16px rgba(170, 133, 167, 0.2);
					transform: translateY(-2px);
				}

				.card-h__image-wrap {
					position: relative;
					width: 160px;
					min-width: 160px;
					height: 120px;
					border-radius: 0.375rem;
					overflow: hidden;
					background: var(--color-base-70);
				}

				.card-h__body {
					flex: 1;
					display: flex;
					flex-direction: column;
					gap: 0.5rem;
				}

				.card-h__title {
					font-size: 1.25rem;
					font-weight: 700;
					color: var(--color-text-strong);
					line-height: 1.4;
				}

				.card-h__description {
					font-size: 0.9rem;
					color: var(--foreground);
					opacity: 0.8;
					line-height: 1.6;
				}

				.card-h__date {
					font-size: 0.8rem;
					color: var(--foreground);
					opacity: 0.5;
					margin-top: auto;
				}
			`}</style>
		</>
	);
}
