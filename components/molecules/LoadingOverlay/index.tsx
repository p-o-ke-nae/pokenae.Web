'use client';

import CustomModal from "@/components/atoms/CustomModal";
import CustomLoader from "@/components/atoms/CustomLoader";

export type LoadingOverlayProps = {
	open: boolean;
	message?: string;
};

const LoadingOverlay = ({ open, message = "読み込み中..." }: LoadingOverlayProps) => {
	return (
		<>
			<CustomModal
				open={open}
				aria-label={message}
				style={{
					background: "transparent",
					boxShadow: "none",
					border: "none",
					overflow: "visible",
				}}
			>
				<div className="loading-overlay">
					<CustomLoader size="lg" />
					<p className="loading-overlay__message">{message}</p>
				</div>
			</CustomModal>

			<style jsx>{`
				.loading-overlay {
					display: flex;
					flex-direction: column;
					align-items: center;
					gap: 1.25rem;
					padding: 2.5rem 3rem;
				}

				.loading-overlay__message {
					font-size: 0.875rem;
					color: var(--color-text-inverse);
					font-weight: 500;
					margin: 0;
					letter-spacing: 0.01em;
					text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
				}
			`}</style>
		</>
	);
};

LoadingOverlay.displayName = "LoadingOverlay";

export default LoadingOverlay;
