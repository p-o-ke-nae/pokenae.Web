'use client';

import {
	createContext,
	useCallback,
	useContext,
	useState,
	useTransition,
	type ReactNode,
} from 'react';
import LoadingOverlay from '@/components/molecules/LoadingOverlay';
import resources from '@/lib/resources';

type StartLoadingFn = (asyncFn: () => Promise<void>, message?: string) => Promise<void>;

type LoadingOverlayContextValue = {
	isPending: boolean;
	startLoading: StartLoadingFn;
};

const LoadingOverlayContext = createContext<LoadingOverlayContextValue | null>(null);

export function LoadingOverlayProvider({ children }: { children: ReactNode }) {
	const [isPending, startTransition] = useTransition();
	const [message, setMessage] = useState<string>(resources.loadingOverlay.message);

	const startLoading = useCallback<StartLoadingFn>(async (asyncFn, msg) => {
		if (msg) setMessage(msg);
		else setMessage(resources.loadingOverlay.message);
		await new Promise<void>((resolve) => {
			startTransition(async () => {
				await asyncFn();
				resolve();
			});
		});
	}, []);

	return (
		<LoadingOverlayContext.Provider value={{ isPending, startLoading }}>
			{children}
			<LoadingOverlay open={isPending} message={message} />
		</LoadingOverlayContext.Provider>
	);
}

export function useLoadingOverlay(): LoadingOverlayContextValue {
	const ctx = useContext(LoadingOverlayContext);
	if (!ctx) throw new Error('useLoadingOverlay must be used within LoadingOverlayProvider');
	return ctx;
}
