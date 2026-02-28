'use client';

import { useState, useId, useEffect, useMemo } from "react";
import CustomTextBox from "@/components/atoms/CustomTextBox";
import CustomButton from "@/components/atoms/CustomButton";
import Dialog from "@/components/molecules/Dialog";
import resources from "@/lib/resources";

export type SearchOption = {
	value: string;
	label: string;
	[key: string]: string;
};

export type SearchFieldColumn = {
	/** SearchOption のどのキーを表示するか */
	key: string;
	/** テーブルヘッダーに表示する名称（省略時はヘッダーなし） */
	header?: string;
	/** 絞り込み検索の対象にするか（デフォルト: true） */
	searchable?: boolean;
	/** 列幅（CSS 値、省略時は auto） */
	width?: string;
};

const DEFAULT_COLUMNS: SearchFieldColumn[] = [
	{ key: "value", searchable: true },
	{ key: "label", searchable: true },
];

export type SearchFieldProps = {
	options: SearchOption[];
	value?: string;
	onChange?: (value: string) => void;
	placeholder?: string;
	dialogTitle?: string;
	/** ダイアログの表示列と検索対象列を定義（省略時は value + label の2列） */
	columns?: SearchFieldColumn[];
	disabled?: boolean;
	isError?: boolean;
	className?: string;
};

const SearchField = ({
	options,
	value = "",
	onChange,
	placeholder,
	dialogTitle,
	columns = DEFAULT_COLUMNS,
	disabled = false,
	isError = false,
	className = "",
}: SearchFieldProps) => {
	const [dialogOpen, setDialogOpen] = useState(false);
	const [filter, setFilter] = useState("");
	const [inputText, setInputText] = useState(value);
	const inputId = useId();

	// 外部からの value 変更（ダイアログ選択後など）に inputText を同期
	useEffect(() => {
		setInputText(value);
	}, [value]);

	const matchedOption = options.find((o) => o.value === value);
	const hasMatch = value !== "" && matchedOption !== undefined;
	const hasNoMatch = value !== "" && matchedOption === undefined;
	const displayLabelValue = (() => {
		if (hasMatch) return matchedOption?.label ?? "";
		if (hasNoMatch) return resources.searchField.noMatch;
		return "";
	})();

	const searchableKeys = useMemo(
		() => columns.filter((c) => c.searchable !== false).map((c) => c.key),
		[columns]
	);

	const hasHeaders = useMemo(
		() => columns.some((c) => c.header !== undefined),
		[columns]
	);

	const filtered = filter
		? options.filter((o) =>
				searchableKeys.some((key) =>
					String(o[key] ?? "")
						.toLowerCase()
						.includes(filter.toLowerCase())
				)
		  )
		: options;

	const handleSelect = (option: SearchOption) => {
		setInputText(option.value);
		onChange?.(option.value);
		setDialogOpen(false);
		setFilter("");
	};

	const handleClear = () => {
		setInputText("");
		onChange?.("");
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const text = e.target.value;
		setInputText(text);
		// 入力中にリアルタイムで value を更新（親への通知）
		onChange?.(text);
	};

	const handleOpenDialog = () => {
		setFilter("");
		setDialogOpen(true);
	};

	const handleCloseDialog = () => {
		setDialogOpen(false);
		setFilter("");
	};

	return (
		<>
			<div className={`search-field ${className}`.trim()}>
				<div className="search-field__input-row">
					{/* メイン: ID 入力テキストボックス */}
					<CustomTextBox
						id={inputId}
						value={inputText}
						onChange={handleInputChange}
						placeholder={placeholder ?? resources.searchField.valuePlaceholder}
						isError={isError}
						disabled={disabled}
						className="search-field__textbox"
						aria-haspopup="dialog"
					/>
					{/* クリアボタン */}
					{value && !disabled && (
						<CustomButton
							type="button"
							variant="ghost"
							onClick={handleClear}
							aria-label={resources.searchField.clearButtonLabel}
							className="search-field__clear"
						>
							✕
						</CustomButton>
					)}
					{/* 検索ダイアログ起動ボタン */}
					<CustomButton
						type="button"
						variant="neutral"
						onClick={handleOpenDialog}
						disabled={disabled}
						aria-label={resources.searchField.searchButtonLabel}
						aria-haspopup="dialog"
						aria-expanded={dialogOpen}
						className="search-field__trigger"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden="true"
						>
							<circle cx="11" cy="11" r="8" />
							<line x1="21" y1="21" x2="16.65" y2="16.65" />
						</svg>
					</CustomButton>
				</div>

				{/* サブ: 名称表示テキストボックス */}
				<div className="search-field__label-row">
					<CustomTextBox
						value={displayLabelValue}
						readOnly
						placeholder={resources.searchField.labelPlaceholder}
						isError={hasNoMatch}
						disabled={disabled}
						tabIndex={-1}
						className="search-field__label-textbox"
						aria-label={resources.searchField.labelPlaceholder}
					/>
				</div>

				<Dialog
					open={dialogOpen}
					onClose={handleCloseDialog}
					title={dialogTitle ?? resources.searchField.dialogTitle}
				>
					<div className="search-field__dialog-content">
						{/* 絞り込み検索入力 */}
						<CustomTextBox
							value={filter}
							onChange={(e) => setFilter(e.target.value)}
							placeholder={resources.searchField.searchPlaceholder}
							autoFocus
						/>
						{/* カスタマイズ可能なテーブル形式一覧 */}
						<div className="search-field__table-wrapper">
							<table className="search-field__table">
								{hasHeaders && (
									<thead>
										<tr>
											{columns.map((col) => (
												<th
													key={col.key}
													className="search-field__th"
													style={col.width ? { width: col.width } : undefined}
												>
													{col.header}
												</th>
											))}
										</tr>
									</thead>
								)}
								<tbody role="listbox">
									{filtered.length > 0 ? (
										filtered.map((option) => (
											<tr
												key={option.value}
												role="option"
												aria-selected={option.value === value}
												className={`search-field__row${option.value === value ? " search-field__row--selected" : ""}`}
												onClick={() => handleSelect(option)}
												onKeyDown={(e) => {
													if (e.key === "Enter" || e.key === " ") {
														e.preventDefault();
														handleSelect(option);
													}
												}}
												tabIndex={0}
											>
												{columns.map((col) => (
													<td
														key={col.key}
														className="search-field__td"
														style={col.width ? { width: col.width } : undefined}
													>
														{String(option[col.key] ?? "")}
													</td>
												))}
											</tr>
										))
									) : (
										<tr>
											<td
												colSpan={columns.length}
												className="search-field__no-results"
											>
												{resources.searchField.noResults}
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					</div>
				</Dialog>
			</div>

			<style jsx>{`
				.search-field {
					display: flex;
					flex-direction: column;
					gap: 0.25rem;
					width: 100%;
				}

				.search-field__input-row {
					display: flex;
					align-items: stretch;
					gap: 0.375rem;
				}

				.search-field__label-row {
					display: flex;
					align-items: stretch;
				}

				.search-field__label-textbox {
					flex: 1;
					min-width: 0;
					font-size: 0.8125rem;
					opacity: 0.85;
				}

				.search-field__textbox {
					flex: 1;
					min-width: 0;
				}

				.search-field__clear :global(.custom-button) {
					flex-shrink: 0;
					padding-left: 0.625rem;
					padding-right: 0.625rem;
				}

				.search-field__trigger :global(.custom-button) {
					flex-shrink: 0;
					padding-left: 0.875rem;
					padding-right: 0.875rem;
				}

				.search-field__dialog-content {
					display: flex;
					flex-direction: column;
					gap: 0.75rem;
				}

				.search-field__table-wrapper {
					border: 1.5px solid var(--color-base-70-dark);
					border-radius: 0.5rem;
					overflow: hidden;
					overflow-y: auto;
					max-height: 18rem;
					background-color: var(--color-base-70-light);
				}

				.search-field__table {
					width: 100%;
					border-collapse: collapse;
				}

				.search-field__th {
					text-align: left;
					padding: 0.5rem 0.875rem;
					font-size: 0.75rem;
					font-weight: 600;
					color: color-mix(in srgb, var(--color-text-strong) 70%, transparent);
					background-color: color-mix(
						in srgb,
						var(--color-accent-25) 6%,
						var(--color-base-70-light)
					);
					border-bottom: 1.5px solid var(--color-base-70-dark);
					white-space: nowrap;
					position: sticky;
					top: 0;
				}

				.search-field__row {
					cursor: pointer;
					font-size: 0.875rem;
					color: var(--color-text-strong);
					transition: background-color 100ms ease;
				}

				.search-field__row:hover {
					background-color: color-mix(
						in srgb,
						var(--color-accent-25) 8%,
						var(--color-base-70-light)
					);
				}

				.search-field__row:focus-visible {
					outline: none;
					background-color: color-mix(
						in srgb,
						var(--color-accent-25) 12%,
						var(--color-base-70-light)
					);
				}

				.search-field__row--selected {
					background-color: color-mix(
						in srgb,
						var(--color-accent-25) 15%,
						var(--color-base-70-light)
					);
					font-weight: 600;
					color: var(--color-accent-25-strong);
				}

				.search-field__row--selected:hover {
					background-color: color-mix(
						in srgb,
						var(--color-accent-25) 20%,
						var(--color-base-70-light)
					);
				}

				.search-field__td {
					padding: 0.625rem 0.875rem;
					vertical-align: middle;
				}

				.search-field__no-results {
					padding: 0.875rem;
					text-align: center;
					font-size: 0.875rem;
					color: color-mix(in srgb, var(--color-text-strong) 50%, transparent);
				}
			`}</style>
		</>
	);
};

SearchField.displayName = "SearchField";

export default SearchField;
