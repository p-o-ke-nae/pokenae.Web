'use client';

import { Children, Fragment, cloneElement, isValidElement } from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import Link from "next/link";
import CustomButton from "@/components/atoms/CustomButton";
import ResponsiveActionGroup from "@/components/molecules/ResponsiveActionGroup";
import { RESPONSIVE_ACTION_MOBILE_BREAKPOINT_PX, type LayoutMode } from '@/lib/hooks/useResponsiveLayoutMode';
import { planFooterRows, type FooterToken } from "./footer-layout";

export type DialogFooterLayoutProps = {
	/** 保存中メッセージなど。常に1行を占有する */
	status?: ReactNode;
	/** 補助操作（前へ/次へ、上へ/下へ、選択解除など）。PC では左寄せ */
	leading?: ReactNode;
	/** 確定系の操作。最後のボタンを主要操作として扱い、PC では右寄せ・モバイルでは単独の全幅行にする */
	trailing?: ReactNode;
	className?: string;
	layoutMode?: LayoutMode;
	/** モバイル時の1行あたりの最大列数（既定 3） */
	mobileMaxColumns?: number;
	/** モバイル時も主要操作を単独行に分けない */
	separatePrimary?: boolean;
};

/** useResponsiveLayoutMode の mobile 判定（幅 < 640px）と揃えたメディアクエリ上限 */
const MOBILE_MAX_WIDTH = `${RESPONSIVE_ACTION_MOBILE_BREAKPOINT_PX - 0.02}px`;

type ElementWithChildren = ReactElement<{ children?: ReactNode; "aria-label"?: string }>;

function isActionElement(node: ReactNode): boolean {
	if (!isValidElement(node)) return false;
	return node.type === CustomButton || node.type === Link || node.type === "button" || node.type === "a";
}

function withKey(node: ReactNode, key: string): ReactNode {
	return isValidElement(node) ? cloneElement(node, { key }) : <span key={key}>{node}</span>;
}

/** Fragment とネストした ResponsiveActionGroup を展開して、ボタン単位の配列にする */
function flattenItems(node: ReactNode, prefix: string): ReactNode[] {
	const items: ReactNode[] = [];
	Children.toArray(node).forEach((child, index) => {
		const key = `${prefix}${isValidElement(child) && child.key != null ? child.key : index}`;
		if (isValidElement(child) && (child.type === Fragment || child.type === ResponsiveActionGroup)) {
			items.push(...flattenItems((child as ElementWithChildren).props.children, `${key}/`));
			return;
		}
		items.push(withKey(child, key));
	});
	return items;
}

function toTokens(node: ReactNode, prefix: string): FooterToken<ReactNode>[] {
	const tokens: FooterToken<ReactNode>[] = [];
	Children.toArray(node).forEach((child, index) => {
		const key = `${prefix}${isValidElement(child) && child.key != null ? child.key : index}`;
		if (isValidElement(child) && child.type === Fragment) {
			tokens.push(...toTokens((child as ElementWithChildren).props.children, `${key}/`));
			return;
		}
		if (isValidElement(child) && child.type === ResponsiveActionGroup) {
			const groupElement = child as ElementWithChildren;
			tokens.push({ type: "group", items: flattenItems(groupElement.props.children, `${key}/`), label: groupElement.props["aria-label"] });
			return;
		}
		tokens.push({ type: isActionElement(child) ? "action" : "block", item: withKey(child, key) });
	});
	return tokens;
}

/**
 * ダイアログのフッター操作を配置する。
 * - PC / タブレット: leading を左、trailing を右に1行で並べ、幅が足りない場合は折り返す
 * - モバイル: 操作グループごとに1行、行内は均等幅のグリッド。trailing の主要操作は最下段の全幅行
 */
export default function DialogFooterLayout({
	status,
	leading,
	trailing,
	className = "",
	layoutMode = 'desktop',
	mobileMaxColumns,
	separatePrimary = true,
}: DialogFooterLayoutProps) {
	const classes = ["dialog-footer-layout", className].filter(Boolean).join(" ");
	const leadingRows = planFooterRows(toTokens(leading, "l:"), { maxColumns: mobileMaxColumns });
	const trailingRows = planFooterRows(toTokens(trailing, "t:"), { separatePrimary, maxColumns: mobileMaxColumns });
	const sides = [
		{ key: "leading", className: "dialog-footer-layout__side dialog-footer-layout__leading", rows: leadingRows },
		{ key: "trailing", className: "dialog-footer-layout__side dialog-footer-layout__trailing", rows: trailingRows },
	].filter((side) => side.rows.length > 0);

	return (
		<>
			<div className={classes} data-layout-mode={layoutMode}>
				{status ? <div className="dialog-footer-layout__status">{status}</div> : null}
				{/* 行要素も styled-jsx のスコープに含めるため、同じ JSX ツリー内で描画する */}
				{sides.map((side) => (
					<div key={side.key} className={side.className}>
						{side.rows.map((row, index) => (row.kind === "block" ? (
							<div key={`block-${index}`} className="dialog-footer-layout__block">{row.item}</div>
						) : (
							<div
								key={`row-${index}`}
								className="dialog-footer-layout__row"
								role={row.label ? "group" : undefined}
								aria-label={row.label}
								data-columns={row.columns}
								data-last-span={row.lastItemSpan}
								style={{ "--dialog-footer-columns": String(row.columns) } as CSSProperties}
							>
								{row.items}
							</div>
						)))}
					</div>
				))}
			</div>

			<style jsx>{`
				.dialog-footer-layout {
					display: flex;
					width: 100%;
					flex-wrap: wrap;
					align-items: center;
					gap: 0.75rem 1rem;
					min-width: 0;
				}

				.dialog-footer-layout__status {
					flex: 1 1 100%;
					min-width: 0;
				}

				.dialog-footer-layout__side,
				.dialog-footer-layout__row {
					display: flex;
					flex-wrap: wrap;
					align-items: center;
					gap: 0.5rem;
					min-width: 0;
					max-width: 100%;
				}

				.dialog-footer-layout__trailing {
					margin-inline-start: auto;
					justify-content: flex-end;
				}

				.dialog-footer-layout__trailing .dialog-footer-layout__row {
					justify-content: flex-end;
				}

				.dialog-footer-layout__block {
					min-width: 0;
				}

				.dialog-footer-layout :global(.custom-button) {
					min-height: 2.75rem;
					max-width: 100%;
				}

				.dialog-footer-layout[data-layout-mode='mobile'],
				.dialog-footer-layout[data-layout-mode='mobile'] .dialog-footer-layout__side {
					display: grid;
					grid-template-columns: minmax(0, 1fr);
					align-items: stretch;
					gap: 0.625rem;
					width: 100%;
					margin-inline-start: 0;
				}

				.dialog-footer-layout[data-layout-mode='mobile'] .dialog-footer-layout__row {
					display: grid;
					grid-template-columns: repeat(var(--dialog-footer-columns, 1), minmax(0, 1fr));
					align-items: stretch;
					gap: 0.5rem;
					width: 100%;
				}

				.dialog-footer-layout[data-layout-mode='mobile'] .dialog-footer-layout__row[data-last-span='2'] > :global(:last-child) {
					grid-column: span 2;
				}

				.dialog-footer-layout[data-layout-mode='mobile'] .dialog-footer-layout__row[data-last-span='3'] > :global(:last-child) {
					grid-column: span 3;
				}

				.dialog-footer-layout[data-layout-mode='mobile'] .dialog-footer-layout__row > :global(*) {
					width: 100%;
					min-width: 0;
				}

				.dialog-footer-layout[data-layout-mode='mobile'] .dialog-footer-layout__row :global(.custom-button) {
					padding-inline: 0.75rem;
					white-space: normal;
				}

				.dialog-footer-layout[data-layout-mode='mobile'] .dialog-footer-layout__row :global(.custom-button__label) {
					white-space: normal;
					text-align: center;
					overflow-wrap: anywhere;
				}

				@media (max-width: ${MOBILE_MAX_WIDTH}) {
					.dialog-footer-layout,
					.dialog-footer-layout__side {
						display: grid;
						grid-template-columns: minmax(0, 1fr);
						align-items: stretch;
						gap: 0.625rem;
						width: 100%;
						margin-inline-start: 0;
					}

					.dialog-footer-layout__row {
						display: grid;
						grid-template-columns: repeat(var(--dialog-footer-columns, 1), minmax(0, 1fr));
						align-items: stretch;
						gap: 0.5rem;
						width: 100%;
					}

					.dialog-footer-layout__row[data-last-span='2'] > :global(:last-child) {
						grid-column: span 2;
					}

					.dialog-footer-layout__row[data-last-span='3'] > :global(:last-child) {
						grid-column: span 3;
					}

					.dialog-footer-layout__row > :global(*) {
						width: 100%;
						min-width: 0;
					}

					.dialog-footer-layout__row :global(.custom-button) {
						padding-inline: 0.75rem;
						white-space: normal;
					}

					.dialog-footer-layout__row :global(.custom-button__label) {
						white-space: normal;
						text-align: center;
						overflow-wrap: anywhere;
					}
				}
			`}</style>
		</>
	);
}
