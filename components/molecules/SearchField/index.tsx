'use client';

import { useState, useId, useEffect } from "react";
import CustomTextBox from "@/components/atoms/CustomTextBox";
import CustomButton from "@/components/atoms/CustomButton";
import Dialog from "@/components/molecules/Dialog";
import resources from "@/lib/resources";

export type SearchOption = {
	label: string;
	value: string;
};

export type SearchFieldProps = {
	options: SearchOption[];
	value?: string;
	onChange?: (value: string) => void;
	placeholder?: string;
	labelPlaceholder?: string;
	dialogTitle?: string;
	disabled?: boolean;
	isError?: boolean;
	className?: string;
};

const SearchField = ({
	options,
	value = "",
	onChange,
	placeholder,
	labelPlaceholder,
	dialogTitle,
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
	const selectedLabel = matchedOption?.label ?? "";

	const hasMatch = value !== "" && matchedOption !== undefined;
	const hasNoMatch = value !== "" && matchedOption === undefined;

	const displayLabelValue = (() => {
		if (hasMatch) return selectedLabel;
		if (hasNoMatch) return resources.searchField.noMatch;
		return "";
	})();

	const filtered = filter
		? options.filter(
				(o) =>
					o.label.toLowerCase().includes(filter.toLowerCase()) ||
					o.value.toLowerCase().includes(filter.toLowerCase())
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
						isError={isError || hasNoMatch}
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
						placeholder={labelPlaceholder ?? resources.searchField.labelPlaceholder}
						isError={hasNoMatch}
						disabled={disabled}
						tabIndex={-1}
						className="search-field__label-textbox"
						aria-label={labelPlaceholder ?? resources.searchField.labelPlaceholder}
					/>
				</div>

				<Dialog
					open={dialogOpen}
					onClose={handleCloseDialog}
					title={dialogTitle ?? resources.searchField.dialogTitle}
				>
					<div className="search-field__dialog-content">
						<CustomTextBox
							value={filter}
							onChange={(e) => setFilter(e.target.value)}
							placeholder={resources.searchField.searchPlaceholder}
							autoFocus
						/>
						<ul className="search-field__list" role="listbox">
							{filtered.length > 0 ? (
								filtered.map((option) => (
									<li
										key={option.value}
										role="option"
										aria-selected={option.value === value}
										className={`search-field__list-item${option.value === value ? " search-field__list-item--selected" : ""}`}
										onClick={() => handleSelect(option)}
										onKeyDown={(e) => {
											if (e.key === "Enter" || e.key === " ") {
												e.preventDefault();
												handleSelect(option);
											}
										}}
										tabIndex={0}
									>
										<span className="search-field__list-value">{option.value}</span>
										<span className="search-field__list-label">{option.label}</span>
									</li>
								))
							) : (
								<li className="search-field__no-results">
									{resources.searchField.noResults}
								</li>
							)}
						</ul>
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

				.search-field__textbox {
					flex: 1;
					min-width: 0;
				}

				.search-field__label-textbox {
					flex: 1;
					min-width: 0;
					font-size: 0.8125rem;
					opacity: 0.85;
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

				.search-field__list {
					list-style: none;
					margin: 0;
					padding: 0;
					max-height: 16rem;
					overflow-y: auto;
					border: 1.5px solid var(--color-base-70-dark);
					border-radius: 0.5rem;
					background-color: var(--color-base-70-light);
				}

				.search-field__list-item {
					display: flex;
					align-items: baseline;
					gap: 0.75rem;
					padding: 0.625rem 0.875rem;
					cursor: pointer;
					font-size: 0.875rem;
					color: var(--color-text-strong);
					transition: background-color 100ms ease;
				}

				.search-field__list-item:hover {
					background-color: color-mix(
						in srgb,
						var(--color-accent-25) 8%,
						var(--color-base-70-light)
					);
				}

				.search-field__list-item:focus-visible {
					outline: none;
					background-color: color-mix(
						in srgb,
						var(--color-accent-25) 12%,
						var(--color-base-70-light)
					);
				}

				.search-field__list-item--selected {
					background-color: color-mix(
						in srgb,
						var(--color-accent-25) 15%,
						var(--color-base-70-light)
					);
					font-weight: 600;
					color: var(--color-accent-25-strong);
				}

				.search-field__list-item--selected:hover {
					background-color: color-mix(
						in srgb,
						var(--color-accent-25) 20%,
						var(--color-base-70-light)
					);
				}

				.search-field__list-value {
					font-family: ui-monospace, monospace;
					font-size: 0.8125rem;
					min-width: 3rem;
					color: color-mix(in srgb, var(--color-text-strong) 70%, transparent);
				}

				.search-field__list-item--selected .search-field__list-value {
					color: color-mix(in srgb, var(--color-accent-25-strong) 80%, transparent);
				}

				.search-field__list-label {
					flex: 1;
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
