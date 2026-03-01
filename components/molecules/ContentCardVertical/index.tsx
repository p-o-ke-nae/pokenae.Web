import Image from 'next/image';
import Link from 'next/link';

export type ContentCardVerticalProps = {
	id: string;
	title: string;
	date: string;
	imageSrc: string;
	imageAlt: string;
	href: string;
	tag?: string;
};

export default function ContentCardVertical({
	title,
	date,
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
					<time className="card-v__date" dateTime={date}>
						{date}
					</time>
				</div>
			</Link>

			<style jsx>{`
				.card-v {
					display: flex;
					flex-direction: column;
					background: var(--background);
					border: 1px solid var(--color-base-70);
					border-radius: 0.5rem;
					overflow: hidden;
					text-decoration: none;
					transition:
						box-shadow 0.2s ease,
						transform 0.2s ease;
				}

				.card-v:hover {
					box-shadow: 0 4px 16px rgba(170, 133, 167, 0.2);
					transform: translateY(-2px);
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

				.card-v__date {
					font-size: 0.75rem;
					color: var(--foreground);
					opacity: 0.5;
					text-align: right;
				}
			`}</style>
		</>
	);
}
