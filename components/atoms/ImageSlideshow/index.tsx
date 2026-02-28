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

const TRANSITION_MS = 500;

export default function ImageSlideshow({
	slides,
	interval = 4000,
	className = '',
}: ImageSlideshowProps) {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [nextIndex, setNextIndex] = useState<number | null>(null);
	const [isSliding, setIsSliding] = useState(false);
	const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const goTo = useCallback(
		(target: number) => {
			if (isSliding) return;
			if (target === currentIndex) return;

			setNextIndex(target);
			setIsSliding(true);

			transitionTimerRef.current = setTimeout(() => {
				setCurrentIndex(target);
				setNextIndex(null);
				setIsSliding(false);
			}, TRANSITION_MS);
		},
		[isSliding, currentIndex],
	);

	// 自動送り
	useEffect(() => {
		if (slides.length <= 1) return;
		const timer = setInterval(() => {
			goTo((currentIndex + 1) % slides.length);
		}, interval);
		return () => clearInterval(timer);
	}, [goTo, currentIndex, slides.length, interval]);

	// アンマウント時のクリーンアップ
	useEffect(() => {
		return () => {
			if (transitionTimerRef.current) {
				clearTimeout(transitionTimerRef.current);
			}
		};
	}, []);

	if (!slides.length) return null;

	return (
		<>
			<div
				className={`slideshow${className ? ` ${className}` : ''}`}
				role="region"
				aria-label="スライドショー"
				aria-live="off"
			>
				<div className="slideshow__track">
					{/* 現在のスライド */}
					<div
						className={`slideshow__slide${isSliding ? ' slideshow__slide--exit' : ''}`}
					>
						<Image
							src={slides[currentIndex].src}
							alt={slides[currentIndex].alt}
							fill
							unoptimized
							sizes="(max-width: 1280px) 100vw, 1280px"
							style={{ objectFit: 'cover' }}
							priority
						/>
					</div>

					{/* 次のスライド（スライド中のみ表示） */}
					{isSliding && nextIndex !== null && (
						<div className="slideshow__slide slideshow__slide--enter">
							<Image
								src={slides[nextIndex].src}
								alt={slides[nextIndex].alt}
								fill
								unoptimized
								sizes="(max-width: 1280px) 100vw, 1280px"
								style={{ objectFit: 'cover' }}
							/>
						</div>
					)}
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

			<style jsx>{`
				.slideshow {
					position: relative;
					width: 100%;
					aspect-ratio: 16 / 6;
					overflow: hidden;
					background: var(--color-base-70);
					border-radius: 0.75rem;
				}

				.slideshow__track {
					position: absolute;
					inset: 0;
				}

				.slideshow__slide {
					position: absolute;
					inset: 0;
					transition: transform ${TRANSITION_MS}ms ease;
					transform: translateX(0);
				}

				.slideshow__slide--exit {
					transform: translateX(-100%);
				}

				.slideshow__slide--enter {
					animation: slideshow-enter ${TRANSITION_MS}ms ease forwards;
				}

				@keyframes slideshow-enter {
					from {
						transform: translateX(100%);
					}
					to {
						transform: translateX(0);
					}
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
			`}</style>
		</>
	);
}
