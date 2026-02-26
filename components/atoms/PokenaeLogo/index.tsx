'use client';

import { forwardRef, useImperativeHandle, useRef } from "react";
import type { HTMLAttributes } from "react";

export type PokenaeLogo = {
	replay: () => void;
};

export type PokenaeLogoProps = HTMLAttributes<SVGSVGElement> & {
	width?: number;
	height?: number;
	autoPlay?: boolean;
};

const PokenaeLogo = forwardRef<PokenaeLogo, PokenaeLogoProps>(
	({ width = 200, height = 60, autoPlay = true, className = "", ...rest }, ref) => {
		const pathRef = useRef<SVGTextElement>(null);

		useImperativeHandle(ref, () => ({
			replay: () => {
				if (!pathRef.current) return;
				const el = pathRef.current;
				el.style.animation = "none";
				// reflow trigger
				void el.getBoundingClientRect();
				el.style.animation = "";
			},
		}));

		const animClass = autoPlay ? "pokenae-logo__text--animate" : "";
		const classes = ["pokenae-logo", className].filter(Boolean).join(" ");

		return (
			<>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width={width}
					height={height}
					viewBox={`0 0 ${width} ${height}`}
					className={classes}
					aria-label="pokenae"
					role="img"
					{...rest}
				>
					<text
						ref={pathRef}
						x="50%"
						y="75%"
						dominantBaseline="middle"
						textAnchor="middle"
						className={`pokenae-logo__text ${animClass}`}
					>
						pokenae
					</text>
				</svg>

				<style jsx>{`
					.pokenae-logo__text {
						font-family: var(--font-geist-sans, sans-serif);
						font-size: ${Math.round(height * 0.65)}px;
						font-weight: 800;
						fill: transparent;
						stroke: var(--color-accent-25);
						stroke-width: 1.5px;
						stroke-dasharray: 600;
						stroke-dashoffset: 600;
						letter-spacing: 0.01em;
					}

					.pokenae-logo__text--animate {
						animation: pokenae-draw 2s ease forwards;
					}

					@keyframes pokenae-draw {
						0% {
							stroke-dashoffset: 600;
							fill: transparent;
						}
						70% {
							stroke-dashoffset: 0;
							fill: transparent;
						}
						100% {
							stroke-dashoffset: 0;
							fill: var(--color-accent-25);
						}
					}
				`}</style>
			</>
		);
	}
);

PokenaeLogo.displayName = "PokenaeLogo";

export default PokenaeLogo;
