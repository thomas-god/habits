/**
 * Structured logging, as a driven port.
 *
 * Callers pass a short, stable `event` name plus arbitrary structured
 * `fields` rather than a freeform message, so the production adapter can
 * emit machine-parseable (JSON) log lines for ingestion by log
 * aggregators/monitoring tools.
 */
export interface Logger {
	warn(event: string, fields?: Record<string, unknown>): void;
	error(event: string, fields?: Record<string, unknown>): void;
}
