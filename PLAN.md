# Habits / Progress Tracker — Plan of Action

A simple habit & progress tracker built with SvelteKit (Svelte 5 runes),
Tailwind 4 + daisyUI, persisted with Node's built-in `node:sqlite`.

Built with a **hexagonal (ports & adapters) architecture**: an explicitly
modelled, dependency-free domain core, a thin application layer of use cases,
and infrastructure/UI adapters that plug into ports defined by the inside.

Fallible operations do **not throw** — they return a Rust-style
`Result<T, E>` (`src/lib/shared/result.ts`) so that recoverable errors are
explicit in the type signature and callers must handle them (via `match`,
`unwrapOr`, `.ok` narrowing, or chaining with `map`/`andThen`). `throw` is
reserved for genuine programmer errors / broken preconditions (the Rust
`panic!` analogue), e.g. calling `dailyProgress` on an overall-goal habit.

## Core concepts

### Habit

A thing the user wants to make progress on. Each habit defines a **unit of
work** — the granularity of a single recordable chunk (e.g. `45'`, `1h`).
Progress is always recorded as a _number of units_ on a given day.

Every habit has a **start date** and an **optional end date**. The end date
doubles as both a deadline you set up front _and_ the marker used for
ending a habit (see below). A habit is **active** when today is within
`[startDate, endDate]` (or `endDate` is unset).

Two habit types:

1. **Daily goal** — a target amount of work _per day_
   (e.g. "3h of piano every day"). Success is evaluated day-by-day.
2. **Overall goal** — a target _total_ amount of work over the whole life of
   the habit (e.g. "spend 100h this summer learning CAD"). Success is
   cumulative and can be paced against the end date when one is set.

### Ending a habit

There is no separate "archived" flag. **Ending a habit sets its `endDate`
to the date of that action** (today), so it stops being active from the
following day on while its history is preserved — the habit stays visible for
the rest of the day it was ended, since it was still "active" for part of
that day. "Active" vs. "ended" is therefore always _derived_ from the dates +
the clock, keeping a single source of truth.

### Unit of work

To keep math simple, we store everything in a base unit of **minutes**.
A habit's `unit_minutes` defines how long one unit is (e.g. `45`, `60`).
Goals and daily entries are stored as **counts of units** (integers), so the
actual time = `count * unit_minutes`.

## Architectural overview (hexagonal)

The dependency rule points **inwards only**: `domain` depends on nothing,
`application` depends on `domain`, and `infrastructure`/`ui` depend on
`application` + `domain`. Outer layers depend on inner ones exclusively
through **ports** (interfaces) declared by the inside.

```
                +--------------------------------------------------+
                |                    UI / driving                  |
                |     SvelteKit routes, load fns, form actions     |
                +----------------------+---------------------------+
                                       | calls use cases
                +----------------------v---------------------------+
                |                  Application                     |
                |   use cases + driven ports (repository ifaces)   |
                +----------------------+---------------------------+
                                       | uses
                +----------------------v---------------------------+
                |                     Domain                       |
                |  entities, value objects, domain services, rules |
                |            (pure, zero dependencies)             |
                +--------------------------------------------------+
                                       ^ implements ports
                +----------------------+---------------------------+
                |                Infrastructure / driven           |
                |   node:sqlite repositories, clock, migrations    |
                +--------------------------------------------------+
```

### Directory layout

```
src/lib/
  shared/                      # shared kernel
    result.ts                  # Result<T, E> container (ok/err + combinators)
    testing.ts                 # test-only expectOk/expectErr helpers

  domain/                      # pure core — no I/O, no framework, no SvelteKit
    ids.ts                     # HabitId (surrogate UUID) + EntryKey (composite)
    habit.ts                   # Habit entity + factory/invariants
    unit-of-work.ts            # UnitOfWork value object (minutes)
    goal.ts                    # DailyGoal / OverallGoal value objects
    entry.ts                   # Entry entity (units on a day)
    day.ts                     # Day value object (ISO calendar date)
    progress.ts                # domain service: progress calculations
    errors.ts                  # domain errors (DomainError, InvalidValue, InvalidHabit)

  application/
    ports/
      habit-repository.ts      # driven port: persistence interface for habits
      entry-repository.ts      # driven port: persistence interface for entries
      clock.ts                 # driven port: today() / now() (testability)
      errors.ts                # ApplicationError, HabitNotFound, CorruptRecord
    use-cases/
      create-habit.ts
      record-entry.ts          # set an absolute count OR nudge by a delta (upsert)
      list-habits-with-progress.ts
      get-habit-detail.ts
      edit-habit.ts
      end-habit.ts
      delete-habit.ts
    dto.ts                     # input/output data shapes for use cases (HabitDTO, EntryDTO, ...)
    mappers.ts                 # domain object -> DTO (toHabitDTO, toEntryDTO)
    parsing.ts                 # raw-input -> value objects, shared by create/edit
    testing.ts                 # in-memory fake repositories + FixedClock, for use-case tests

  infrastructure/
    db/
      database.ts                 # node:sqlite DatabaseSync singleton + config
      migrations.ts               # schema creation / migrations
      sqlite-habit-repository.ts  # adapter implementing HabitRepository
      sqlite-entry-repository.ts  # adapter implementing EntryRepository
    system-clock.ts               # adapter implementing Clock
    container.ts                  # composition root: wires ports -> adapters

  server/
    app.ts                     # exposes wired use cases to SvelteKit (imports container)
```

Notes:

- **Domain** contains no `node:sqlite`, no SvelteKit, no dates-as-strings
  leaking framework concerns — only rich types and behaviour.
- **Application** orchestrates domain objects and depends on **ports**, never
  on concrete infra.
- **Infrastructure** is the only place that touches `node:sqlite`. Repository
  adapters translate between persistence rows and domain objects.
- **Composition root** (`container.ts`) is the single place that instantiates
  adapters and injects them into use cases; the UI imports fully wired use
  cases from `server/app.ts`.

## Domain model (explicit)

- **`UnitOfWork`** — value object wrapping `minutes` (> 0). Knows how to
  convert a unit count to total minutes and format nicely.
- **`Day`** — value object over an ISO calendar date (`YYYY-MM-DD`), a thin
  wrapper around the standard `Temporal.PlainDate` (Node ships it globally;
  `@types/node` provides the types). Parsing, validation and calendar
  arithmetic (compare, `daysUntil`, `plusDays`) delegate to Temporal rather
  than hand-rolled math; we keep only a strict `YYYY-MM-DD` format guard and
  the domain vocabulary. Keeps date handling in one place.
- **`Goal`** — sum type (the _target_, independent of scheduling):
  - `DailyGoal { targetUnits }`
  - `OverallGoal { targetUnits }`
- **`Habit`** — entity: `id`, `name`, `unitOfWork`, `goal`, `startDate: Day`,
  `endDate?: Day`, `createdAt`. A single smart constructor `Habit.from(...)`
  ("parse, don't validate") is the only way to obtain a `Habit`: it enforces
  the invariants (name non-empty, `endDate >= startDate` when present) and
  returns a `Result`. There is no separate create/rehydrate path — the caller
  supplies the identity (`HabitId.generate()` for new, the stored id when
  loading) and `createdAt`, so both form input and database rows are parsed
  through the same gate. Type is derived from the kind of `Goal`. Provides
  `isActive(today)` / `isEnded(today)` (derived from the dates), `endOn(day)`
  (returns a copy with `endDate = day`), and `update(changes)`.
- **Identity**
  - `HabitId` — a surrogate UUID identity, generated by the domain
    (`HabitId.generate()`). A habit needs a surrogate because two habits can
    share every attribute yet be distinct. Persistence stores the UUID as the
    key; any DB integer `rowid` is an infra-only artifact never surfaced.
  - `EntryKey` — the _natural composite_ identity `(habitId, day)`. An entry
    is uniquely identified by its habit and day ("at most one entry per habit
    per day"), so it needs no surrogate id.
- **`Entry`** — entity keyed by `(habitId, day)`: `habitId: HabitId`,
  `day: Day`, `units` (>= 0), exposing its `key: EntryKey`.
- **`progress` domain service** — pure functions:
  - daily progress for a habit on a given day (done vs. target, %).
  - overall progress from a set of entries (total vs. target, %, optional
    pace vs. deadline: remaining units / remaining days).

Domain functions operate on domain objects and are trivially unit-testable
without any database.

Validating constructors/factories (`Day.fromISO`, `UnitOfWork.ofMinutes`,
`DailyGoal.of`/`OverallGoal.of`, `Entry.create`/`restore`/`withUnits`,
`Habit.create`/`endOn`/`update`) return `Result<_, DomainError>`.
Infallible operations (comparisons, `Day.today`, `Entry.adjustBy` which
clamps at zero, `Habit.isActive`) return plain values.

Rehydration is not trusted. Following "parse, don't validate", `Habit.from` is
the single gate for constructing a habit from any source; there is no
create-vs-restore split. Corrupt persisted data is therefore rejected at the
boundary (as a `Result` error) instead of propagating a broken entity. (`Entry`
likewise has one `Entry.create`/`restore` path that validates units.) The
application layer's `HabitRepository`/`EntryRepository` reads propagate this as
a typed `CorruptRecord` error (see below).

## Persistence (infrastructure detail)

Relational schema owned by the SQLite adapters (not the domain):

```
habit
  id            TEXT PRIMARY KEY          -- HabitId (UUID), assigned by the domain
  name          TEXT NOT NULL
  type          TEXT NOT NULL CHECK (type IN ('daily', 'overall'))
  unit_minutes  INTEGER NOT NULL          -- length of one unit of work
  goal_units    INTEGER NOT NULL          -- daily target OR overall target
  start_date    TEXT NOT NULL             -- ISO date
  end_date      TEXT                      -- ISO date deadline/end marker, optional
  created_at    TEXT NOT NULL             -- ISO instant

entry
  habit_id      TEXT NOT NULL REFERENCES habit(id) ON DELETE CASCADE
  day           TEXT NOT NULL             -- ISO date (YYYY-MM-DD)
  units         INTEGER NOT NULL          -- units of work done that day
  PRIMARY KEY (habit_id, day)
```

Notes:

- `habit.id` is `TEXT PRIMARY KEY` (the domain's UUID `HabitId`), not an
  autoincrement integer: identity is a domain concept the database stores,
  not one it assigns (see "Identity" above). No surrogate `entry.id` exists
  either — `(habit_id, day)` is both the natural key and the `UNIQUE`
  constraint, matching the domain's `EntryKey`.
- One `entry` row per (habit, day); recording again updates the count.
- `ON DELETE CASCADE` cleans entries when a habit is deleted.
- Repository adapters map rows <-> domain objects via `Habit.from`/
  `Entry.create`, surfacing a failed parse as `CorruptRecord` rather than
  trusting the row (mappers kept in infra).
- `start_date` is always set; `end_date` NULL means the habit has no deadline
  and has not been ended. Ending a habit simply writes today's date into
  `end_date`.
- "Active" is not stored: it is computed from `start_date`/`end_date` vs. the
  `Clock`'s today, both in the domain and (where needed) via SQL predicates.

## Application layer (use cases)

Each use case is a plain async function `(deps, input) => Promise<Result<Output, Error>>`:
`deps` is the ports it needs (`HabitRepository`, `EntryRepository`, `Clock`),
`input`/`Output` are plain DTOs (`dto.ts`) — domain objects never leak to the
UI. The composition root (a later step) partially applies `deps` so
`server/app.ts` exposes plain `(input) => Promise<Result<...>>` functions.

Errors are unions of `DomainError` (invalid input), `HabitNotFound` (a
well-formed id that doesn't exist), and `CorruptRecord` (a stored row failed
to parse) — all recoverable, hence part of the `Result`, never thrown.
"Today"/"now" always come from the injected `Clock`, never `Day.today()`/
`new Date()` directly, so use cases stay deterministic and testable.

- `createHabit(deps, input)` — parse raw fields (`parsing.ts`), build a
  `Habit` with a freshly generated `HabitId` and `clock.now()`, persist.
- `recordEntry(deps, input)` — upsert an entry for a habit on a day (defaults
  to `clock.today()`), either setting an absolute `units` count or nudging
  the existing count by a `delta` (clamped at zero) — covers both a "log N
  units" form and quick +/- controls with one use case.
- `listHabitsWithProgress(deps, input?)` — every (by default, active) habit
  paired with its `progressFor(...)` as of `clock.today()`.
- `getHabitDetail(deps, input)` — one habit, its full history (sorted by
  day), and its progress.
- `editHabit(deps, input)` — update only the supplied fields (`endDate: null`
  explicitly clears it), re-validated via `Habit.update`.
- `endHabit(deps, input)` — `habit.endOn(clock.today())` and persist.
- `deleteHabit(deps, input)` — remove the habit (schema cascade removes its
  entries in the real adapter; the in-memory test fake does _not_ cascade,
  since cascading is a persistence-schema detail, not an application rule).

A domain service `progressFor(habit, entries, today)` (in `domain/progress.ts`)
dispatches to `dailyProgress`/`overallProgress` based on the habit's goal
kind, so this branching lives once, in the domain, not duplicated across the
`listHabitsWithProgress`/`getHabitDetail` use cases.

## UI adapter (SvelteKit)

Driving adapter only — no business logic. Routes call use cases from
`server/app.ts` inside `load` functions and **form actions**.

- `/` — dashboard: active habits with today's progress + quick `+`/`-`
  unit controls.
- `/habits/new` — create-habit form.
- `/habits/[id]` — detail: history, progress, edit/end/delete.

Human-friendly time formatting (units -> hours/minutes) lives as a UI/domain
formatting helper. daisyUI cards, progress bars/radials, mobile-friendly.

## Testing strategy

- **Domain**: pure unit tests (value objects, invariants, progress math) —
  fast, no I/O.
- **Application**: use-case tests against **in-memory fake repositories**
  (`application/testing.ts`: `InMemoryHabitRepository`, `InMemoryEntryRepository`,
  `FixedClock`, all implementing the real ports) — verifies orchestration
  without SQLite.
- **Infrastructure**: contract tests for SQLite repositories against a
  `:memory:` database, asserting they satisfy the port contracts.
- All under the existing `server` vitest project.

## Implementation steps

1. Scaffold layer folders; add `.gitignore` entry for the db file; decide db
   path (`data/habits.db`, overridable via `DATABASE_PATH`).
2. **Domain**: value objects (`UnitOfWork`, `Day`, `Goal`), entities
   (`Habit` with `startDate`/optional `endDate`, `isActive`, `endOn`;
   `Entry`), `progress` service, `errors` + unit tests.
3. ~~**Application ports**: `HabitRepository`, `EntryRepository`, `Clock`.~~ done.
4. ~~**Application use cases** + DTOs + tests using in-memory fake repos.~~ done.
5. **Infrastructure**: `database.ts` (node:sqlite) + `migrations.ts`.
6. SQLite repository adapters + mappers + contract tests (`:memory:`).
7. `system-clock.ts`, `container.ts` composition root, `server/app.ts`.
8. UI: dashboard route (load + record actions).
9. UI: create-habit route (form + action).
10. UI: habit detail route (history + edit/end/delete).
11. Formatting helpers + daisyUI polish + navigation/layout.

## Open questions / future ideas

- Single-user (no auth) for now — assume local/self-hosted.
- Timezone handling: `Clock` port returns "today"; local date initially.
- Streaks, reminders, charts, CSV export — later.
- Could formalise use cases as classes with a shared `UseCase` interface if
  the surface grows.
