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
					background: "white",
					boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
					border: "1px solid rgba(0,0,0,0.08)",
					overflow: "visible",
				}}
			>
				<div className="loading-overlay">
					<CustomLoader size="lg" variant="bold" />
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
					color-scheme: light;
				}

				.loading-overlay__message {
					font-size: 0.875rem;
					color: var(--color-text-strong);
					font-weight: 500;
					margin: 0;
					letter-spacing: 0.01em;
				}
			`}</style>
		</>
	);
};

LoadingOverlay.displayName = "LoadingOverlay";

export default LoadingOverlay;
