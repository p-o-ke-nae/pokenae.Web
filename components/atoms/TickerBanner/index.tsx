'use client';

import { useEffect, useRef, useState } from 'react';

export type TickerItem = {
	id: string;
	text: string;
	href?: string;
	/** ハイライト表示（黄色バッジ）にする場合は true */
	highlighted?: boolean;
};

export type TickerBannerProps = {
	items: TickerItem[];
	/** スクロール速度（px/秒）。デフォルト: 80 */
	speed?: number;
	className?: string;
};

export default function TickerBanner({
	items,
	speed = 80,
	className = '',
}: TickerBannerProps) {
	const trackRef = useRef<HTMLDivElement>(null);
	const [duration, setDuration] = useState<number>(30);

	// シームレスループのためにアイテムを複製する倍数
	const DUPLICATION_FACTOR = 2;

	// マウント後に実際のコンテンツ幅から duration を計算
	useEffect(() => {
		if (!trackRef.current) return;
		// track は items を DUPLICATION_FACTOR 倍複製しているため、1周分は scrollWidth / DUPLICATION_FACTOR
		const oneLoopWidth = trackRef.current.scrollWidth / DUPLICATION_FACTOR;
		if (oneLoopWidth > 0) {
			setDuration(oneLoopWidth / speed);
		}
	}, [speed, items]);

	if (!items.length) return null;

	// シームレスなループのためにアイテムを複製
	const allItems = Array.from({ length: DUPLICATION_FACTOR }, () => items).flat();

	return (
		<>
			<div
				className={`ticker${className ? ` ${className}` : ''}`}
				aria-label="お知らせ"
				role="marquee"
			>
				<div
					ref={trackRef}
					className="ticker__track"
					style={{ animationDuration: `${duration}s` }}
				>
					{allItems.map((item, index) => (
						<span
							key={`${item.id}-${index}`}
							className={`ticker__item${item.highlighted ? ' ticker__item--highlighted' : ''}`}
						>
							{item.href ? (
								<a href={item.href} className="ticker__link">
									{item.text}
								</a>
							) : (
								item.text
							)}
						</span>
					))}
				</div>
			</div>

			<style jsx>{`
				.ticker {
					width: 100%;
					background: #1a1a2e;
					color: #f0f0f0;
					overflow: hidden;
					border-top: 2px solid var(--color-accent-25);
					border-bottom: 2px solid var(--color-accent-25);
				}

				.ticker__track {
					display: inline-flex;
					white-space: nowrap;
					gap: 4rem;
					padding: 0.6rem 0;
					animation: ticker-scroll linear infinite;
				}

				@keyframes ticker-scroll {
					from {
						transform: translateX(0);
					}
					to {
						transform: translateX(-50%);
					}
				}

				.ticker__item {
					font-size: 0.875rem;
					flex-shrink: 0;
				}

				.ticker__item--highlighted {
					display: inline-flex;
					align-items: center;
					background: #f5c300;
					color: #1a1a2e;
					font-weight: 700;
					padding: 0.15rem 0.6rem;
					border-radius: 0.2rem;
				}

				.ticker__link {
					color: inherit;
					text-decoration: underline;
					text-decoration-color: transparent;
					transition: text-decoration-color 0.2s;
				}

				.ticker__link:hover {
					text-decoration-color: currentColor;
				}
			`}</style>
		</>
	);
}
