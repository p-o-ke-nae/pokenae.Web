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
				style={{
					background: "white",
					boxShadow: "none",
					border: "2px solid var(--color-accent-25)",
					overflow: "visible",
					borderRadius: "1rem",
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
					color: #374151;
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
