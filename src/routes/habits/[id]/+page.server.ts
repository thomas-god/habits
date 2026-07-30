import { useCases } from '$lib/server/app.js';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ params }) => {
	const result = await useCases.getHabitDetail({ habitId: params.id });
	if (!result.ok) {
		if (result.error.constructor.name === 'HabitNotFound') error(404, 'Habit not found');
		throw new Error(result.error.message);
	}
	return result.value;
};

export const actions: Actions = {
	record: async ({ request, params }) => {
		const data = await request.formData();
		const result = await useCases.recordEntry({
			habitId: params.id,
			day: data.get('day') as string,
			units: Number(data.get('units'))
		});
		if (!result.ok) return fail(400, { error: result.error.message });
	},

	edit: async ({ request, params }) => {
		const data = await request.formData();
		const endDateRaw = data.get('endDate') as string;
		const result = await useCases.editHabit({
			habitId: params.id,
			name: data.get('name') as string,
			targetUnits: Number(data.get('targetUnits')),
			startDate: data.get('startDate') as string,
			endDate: endDateRaw || null
		});
		if (!result.ok) return fail(400, { error: result.error.message });
	},

	archive: async ({ params }) => {
		const result = await useCases.archiveHabit({ habitId: params.id });
		if (!result.ok) return fail(400, { error: result.error.message });
		redirect(303, '/');
	},

	delete: async ({ params }) => {
		const result = await useCases.deleteHabit({ habitId: params.id });
		if (!result.ok) return fail(400, { error: result.error.message });
		redirect(303, '/');
	}
};
