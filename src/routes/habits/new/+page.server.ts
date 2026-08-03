import { useCases } from '$lib/server/app.js';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types.js';

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const unitMinutesRaw = data.get('unitMinutes') as string;

		const result = await useCases.createHabit({
			name: data.get('name') as string,
			description: (data.get('description') as string) || null,
			unitMinutes: unitMinutesRaw ? Number(unitMinutesRaw) : null,
			goalKind: data.get('goalKind') as 'daily' | 'overall' | 'progress',
			targetUnits: Number(data.get('targetUnits')),
			startDate: data.get('startDate') as string,
			endDate: (data.get('endDate') as string) || null
		});

		if (!result.ok) return fail(400, { error: result.error.message });
		redirect(303, '/');
	}
};
