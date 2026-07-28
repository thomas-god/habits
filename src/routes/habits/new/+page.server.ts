import { useCases } from '$lib/server/app.js';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types.js';

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();

		const result = await useCases.createHabit({
			name: data.get('name') as string,
			unitMinutes: Number(data.get('unitMinutes')),
			goalKind: data.get('goalKind') as 'daily' | 'overall',
			targetUnits: Number(data.get('targetUnits')),
			startDate: data.get('startDate') as string,
			endDate: (data.get('endDate') as string) || null
		});

		if (!result.ok) return fail(400, { error: result.error.message });
		redirect(303, '/');
	}
};
