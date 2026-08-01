import type { Logger } from '../application/ports/logger.ts';

/**
 * Production `Logger` that writes one JSON object per line to stdout/stderr —
 * the format log shippers (Promtail, Fluent Bit, Docker's `json-file`
 * driver, ...) parse out of the box, without a dedicated logging library.
 */
export class JsonLogger implements Logger {
	warn(event: string, fields: Record<string, unknown> = {}): void {
		this.write(console.warn, 'warn', event, fields);
	}

	error(event: string, fields: Record<string, unknown> = {}): void {
		this.write(console.error, 'error', event, fields);
	}

	private write(
		sink: (line: string) => void,
		level: 'warn' | 'error',
		event: string,
		fields: Record<string, unknown>
	): void {
		sink(JSON.stringify({ ts: new Date().toISOString(), level, event, ...fields }));
	}
}
