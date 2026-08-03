import { useCases } from '$lib/server/app.js';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ url }) => {
	const includeEnded = url.searchParams.get('ended') === '1';
	const result = await useCases.listHabitsWithTodayEntry({ includeEnded });
	if (!result.ok) throw new Error(result.error.message);
	return { habits: result.value, includeEnded };
};

export const actions: Actions = {
	record: async ({ request }) => {
		const data = await request.formData();
		const habitId = data.get('habitId') as string;
		const delta = Number(data.get('delta'));

		const result = await useCases.recordEntry({ habitId, delta });
		if (!result.ok) return fail(400, { error: result.error.message });
	},

	move: async ({ request }) => {
		const data = await request.formData();
		const habitId = data.get('habitId') as string;
		const direction = data.get('direction') as 'up' | 'down';

		const result = await useCases.moveHabit({ habitId, direction });
		if (!result.ok) return fail(400, { error: result.error.message });
	}
};
