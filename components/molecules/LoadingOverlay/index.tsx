'use client';

import CustomModal from "@/components/atoms/CustomModal";
import CustomLoader from "@/components/atoms/CustomLoader";
import resources from "@/lib/resources";

export type LoadingOverlayProps = {
	open: boolean;
	message?: string;
};

const LoadingOverlay = ({ open, message = resources.loadingOverlay.message }: LoadingOverlayProps) => {
	return (
		<>
			<CustomModal
				open={open}
				aria-label={message}
				className="loading-overlay-modal"
			>
				<div className="loading-overlay">
					<CustomLoader size="lg" variant="bold" />
					<p className="loading-overlay__message">{message}</p>
				</div>
			</CustomModal>

			<style jsx global>{`
				dialog.loading-overlay-modal {
					background: white;
					box-shadow: none;
					border: 2px solid var(--color-accent-25);
					overflow: visible;
					border-radius: 1rem;
					outline: none;
					cursor: default;
					user-select: none;
				}

				dialog.loading-overlay-modal::backdrop {
					cursor: default;
				}
			`}</style>

			<style jsx>{`
				.loading-overlay {
					display: flex;
					flex-direction: column;
					align-items: center;
					gap: 1.25rem;
					padding: 2.5rem 3rem;
					color-scheme: light;
					cursor: default;
					user-select: none;
				}

				.loading-overlay__message {
					font-size: 0.875rem;
					color: #374151;
					font-weight: 500;
					margin: 0;
					letter-spacing: 0.01em;
					cursor: default;
				}
			`}</style>
		</>
	);
};

LoadingOverlay.displayName = "LoadingOverlay";

export default LoadingOverlay;
