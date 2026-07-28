/**
 * Format a unit count as a human-readable duration string.
 *   formatDuration(3, 60)  → "3h"
 *   formatDuration(3, 45)  → "2h 15m"
 *   formatDuration(1, 30)  → "30m"
 */
export function formatDuration(units: number, unitMinutes: number): string {
	const total = units * unitMinutes;
	const h = Math.floor(total / 60);
	const m = total % 60;
	if (h === 0) return `${m}m`;
	if (m === 0) return `${h}h`;
	return `${h}h ${m}m`;
}

/**
 * Format a single unit of work as a short label.
 *   formatUnit(60)  → "1h"
 *   formatUnit(45)  → "45m"
 *   formatUnit(90)  → "1h 30m"
 */
export function formatUnit(unitMinutes: number): string {
	return formatDuration(1, unitMinutes);
}

/**
 * Format a progress ratio (0–1) as a percentage string.
 *   formatPercent(0.333) → "33%"
 *   formatPercent(1)     → "100%"
 */
export function formatPercent(ratio: number): string {
	return `${Math.round(ratio * 100)}%`;
}

/**
 * Format an ISO date string for display.
 *   formatDate("2024-06-01") → "Jun 1, 2024"
 */
export function formatDate(iso: string): string {
	return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		timeZone: 'UTC'
	});
}
