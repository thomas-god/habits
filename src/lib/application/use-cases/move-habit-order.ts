import { HabitId, type DomainError } from '../../domain/index.ts';
import { err, ok, type Result } from '../../shared/result.ts';
import { HabitNotFound, type CorruptRecord } from '../ports/errors.ts';
import type { HabitOrderRepository } from '../ports/habit-order-repository.ts';

export type MoveHabitOrderDirection = 'up' | 'down';

export interface MoveHabitOrderInput {
	habitId: string;
	direction: MoveHabitOrderDirection;
}

export type MoveHabitOrderError = DomainError | HabitNotFound | CorruptRecord;

export interface MoveHabitOrderDeps {
	habitOrder: HabitOrderRepository;
}

/**
 * Swap a habit's position with its neighbour in the given direction. A move
 * at either end of the list (top can't go up, bottom can't go down) is a
 * silent no-op — the UI won't offer the button in that state, but a
 * defensive direct call shouldn't error.
 */
export async function moveHabit(
	deps: MoveHabitOrderDeps,
	input: MoveHabitOrderInput
): Promise<Result<void, MoveHabitOrderError>> {
	const idResult = HabitId.fromString(input.habitId);
	if (!idResult.ok) return err(idResult.error);

	const orderResult = await deps.habitOrder.list();
	if (!orderResult.ok) return err(orderResult.error);
	const order = orderResult.value;

	const index = order.findIndex((id) => id.equals(idResult.value));
	if (index === -1) return err(new HabitNotFound(input.habitId));

	const swapWith = input.direction === 'up' ? index - 1 : index + 1;
	if (swapWith < 0 || swapWith >= order.length) return ok(undefined);

	[order[index], order[swapWith]] = [order[swapWith], order[index]];
	await deps.habitOrder.save(order);
	return ok(undefined);
}
