'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';

export type SlideItem = {
	id: string;
	src: string;
	alt: string;
};

export type ImageSlideshowProps = {
	/** スライドのデータ配列 */
	slides: SlideItem[];
	/** 各スライドの表示時間（ミリ秒）。デフォルト: 4000 */
	interval?: number;
	className?: string;
};

const TRANSITION_MS = 600;
const SWIPE_THRESHOLD = 50;

export default function ImageSlideshow({
	slides,
	interval = 4000,
	className = '',
}: ImageSlideshowProps) {
	const [currentIndex, setCurrentIndex] = useState(0);
	const touchStartX = useRef<number | null>(null);

	const goTo = useCallback(
		(target: number) => {
			setCurrentIndex(target);
		},
		[],
	);

	// 自動送り
	useEffect(() => {
		if (slides.length <= 1) return;
		const timer = setInterval(() => {
			setCurrentIndex((prev) => (prev + 1) % slides.length);
		}, interval);
		return () => clearInterval(timer);
	}, [slides.length, interval]);

	// スワイプ開始
	const handleTouchStart = useCallback((e: React.TouchEvent) => {
		touchStartX.current = e.touches[0].clientX;
	}, []);

	// スワイプ終了
	const handleTouchEnd = useCallback(
		(e: React.TouchEvent) => {
			if (touchStartX.current === null) return;
			const diff = touchStartX.current - e.changedTouches[0].clientX;
			if (Math.abs(diff) > SWIPE_THRESHOLD) {
				if (diff > 0) {
					goTo((currentIndex + 1) % slides.length);
				} else {
					goTo((currentIndex - 1 + slides.length) % slides.length);
				}
			}
			touchStartX.current = null;
		},
		[goTo, currentIndex, slides.length],
	);

	if (!slides.length) return null;

	return (
		<>
			<div className={`slideshow-wrap${className ? ` ${className}` : ''}`}>
				{/* メインビューポート */}
				<div
					className="slideshow"
					role="region"
					aria-label="スライドショー"
					aria-live="off"
					onTouchStart={handleTouchStart}
					onTouchEnd={handleTouchEnd}
				>
					<div
						className="slideshow__track"
						style={{ transform: `translateX(-${currentIndex * 100}%)` }}
					>
						{slides.map((slide, i) => (
							<div key={slide.id} className="slideshow__slide">
								<Image
									src={slide.src}
									alt={slide.alt}
									fill
									unoptimized
									sizes="(max-width: 1280px) 100vw, 1280px"
									style={{ objectFit: 'cover' }}
									priority={i === 0}
								/>
							</div>
						))}
					</div>

					{/* ドットナビゲーション */}
					{slides.length > 1 && (
						<div className="slideshow__dots" role="tablist" aria-label="スライド選択">
							{slides.map((slide, i) => (
								<button
									key={slide.id}
									role="tab"
									aria-selected={i === currentIndex}
									aria-label={`スライド ${i + 1}へ`}
									className={`slideshow__dot${i === currentIndex ? ' slideshow__dot--active' : ''}`}
									onClick={() => goTo(i)}
								/>
							))}
						</div>
					)}
				</div>

				{/* サムネイル一覧 */}
				{slides.length > 1 && (
					<div
						className="slideshow__thumbnails"
						role="tablist"
						aria-label="スライド一覧"
					>
						{slides.map((slide, i) => (
							<button
								key={slide.id}
								role="tab"
								aria-selected={i === currentIndex}
								aria-label={`スライド ${i + 1}へ`}
								className={`slideshow__thumb${i === currentIndex ? ' slideshow__thumb--active' : ''}`}
								onClick={() => goTo(i)}
							>
								<Image
									src={slide.src}
									alt={slide.alt}
									fill
									unoptimized
									sizes="120px"
									style={{ objectFit: 'cover' }}
								/>
							</button>
						))}
					</div>
				)}
			</div>

			<style jsx>{`
				.slideshow-wrap {
					width: 100%;
					border-radius: 0.75rem;
					overflow: hidden;
					background: var(--color-base-70);
				}

				.slideshow {
					position: relative;
					width: 100%;
					aspect-ratio: 16 / 6;
					overflow: hidden;
				}

				.slideshow__track {
					display: flex;
					height: 100%;
					transition: transform ${TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.2, 1);
					will-change: transform;
				}

				.slideshow__slide {
					position: relative;
					flex: 0 0 100%;
					height: 100%;
				}

				.slideshow__dots {
					position: absolute;
					bottom: 1rem;
					left: 50%;
					transform: translateX(-50%);
					display: flex;
					gap: 0.5rem;
					z-index: 10;
				}

				.slideshow__dot {
					width: 0.5rem;
					height: 0.5rem;
					border-radius: 50%;
					border: 2px solid rgba(255, 255, 255, 0.8);
					background: transparent;
					cursor: pointer;
					padding: 0;
					transition:
						background 0.2s ease,
						transform 0.2s ease;
				}

				.slideshow__dot--active {
					background: white;
					transform: scale(1.3);
				}

				.slideshow__thumbnails {
					display: flex;
					gap: 0.5rem;
					padding: 0.5rem;
					background: var(--color-base-90, #111);
					justify-content: center;
				}

				.slideshow__thumb {
					position: relative;
					width: 96px;
					height: 54px;
					border-radius: 0.25rem;
					overflow: hidden;
					border: 2px solid transparent;
					cursor: pointer;
					padding: 0;
					background: var(--color-base-70);
					transition:
						border-color 0.2s ease,
						opacity 0.2s ease;
					opacity: 0.5;
					flex-shrink: 0;
				}

				.slideshow__thumb--active {
					border-color: var(--color-accent-25);
					opacity: 1;
				}

				.slideshow__thumb:hover:not(.slideshow__thumb--active) {
					opacity: 0.8;
				}
			`}</style>
		</>
	);
}
