import type { HandleServerError } from '@sveltejs/kit';
import { getContainer } from '$lib/infrastructure/container.js';

export const handleError: HandleServerError = ({ error, event }) => {
	getContainer().logger.error('unhandled_error', {
		path: event.url.pathname,
		message: error instanceof Error ? error.message : String(error)
	});
};
