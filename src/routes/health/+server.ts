import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

/** Lightweight liveness endpoint for container/orchestrator health checks. */
export const GET: RequestHandler = () => {
	return json({ status: 'ok' });
};
