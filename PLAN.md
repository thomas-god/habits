# Habits / Progress Tracker — Plan of Action

A simple habit & progress tracker built with SvelteKit (Svelte 5 runes),
Tailwind 4 + daisyUI, persisted with Node's built-in `node:sqlite`.

Built with a **hexagonal (ports & adapters) architecture**: an explicitly
modelled, dependency-free domain core, a thin application layer of use cases,
and infrastructure/UI adapters that plug into ports defined by the inside.

## Core concepts

### Habit

A thing the user wants to make progress on. Each habit defines a **unit of
work** — the granularity of a single recordable chunk (e.g. `45'`, `1h`).
Progress is always recorded as a *number of units* on a given day.

Every habit has a **start date** and an **optional end date**. The end date
doubles as both a deadline you set up front *and* the marker used for
archiving (see below). A habit is **active** when today is within
`[startDate, endDate]` (or `endDate` is unset).

Two habit types:

1. **Daily goal** — a target amount of work *per day*
   (e.g. "3h of piano every day"). Success is evaluated day-by-day.
2. **Overall goal** — a target *total* amount of work over the whole life of
   the habit (e.g. "spend 100h this summer learning CAD"). Success is
   cumulative and can be paced against the end date when one is set.

### Archiving

There is no separate "archived" flag. **Archiving a habit sets its `endDate`
to the date of the archive action** (today), so it stops being active from
that day on while its history is preserved. "Active" vs. "ended" is therefore
always *derived* from the dates + the clock, keeping a single source of truth.

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
  domain/                      # pure core — no I/O, no framework, no SvelteKit
    habit.ts                   # Habit entity + factory/invariants
    unit-of-work.ts            # UnitOfWork value object (minutes)
    goal.ts                    # DailyGoal / OverallGoal value objects
    entry.ts                   # Entry entity (units on a day)
    day.ts                     # Day value object (ISO calendar date)
    progress.ts                # domain service: progress calculations
    errors.ts                  # domain errors (e.g. InvalidGoal)

  application/
    ports/
      habit-repository.ts      # driven port: persistence interface for habits
      entry-repository.ts      # driven port: persistence interface for entries
      clock.ts                 # driven port: "today" / now (testability)
    use-cases/
      create-habit.ts
      record-entry.ts          # add/adjust units for a habit on a day
      list-habits-with-progress.ts
      get-habit-detail.ts
      edit-habit.ts
      archive-habit.ts
      delete-habit.ts
    dto.ts                     # input/output data shapes for use cases

  infrastructure/
    db/
      database.ts              # node:sqlite DatabaseSync singleton + config
      migrations.ts            # schema creation / migrations
    sqlite-habit-repository.ts # adapter implementing HabitRepository
    sqlite-entry-repository.ts # adapter implementing EntryRepository
    system-clock.ts            # adapter implementing Clock
    container.ts               # composition root: wires ports -> adapters

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
- **`Day`** — value object over an ISO calendar date (`YYYY-MM-DD`), with
  helpers (compare, difference in days). Keeps date handling in one place.
- **`Goal`** — sum type (the *target*, independent of scheduling):
  - `DailyGoal { targetUnits }`
  - `OverallGoal { targetUnits }`
- **`Habit`** — entity: `id`, `name`, `unitOfWork`, `goal`, `startDate: Day`,
  `endDate?: Day`, `createdAt`. Factory enforces invariants (name non-empty,
  target > 0, `endDate >= startDate` when present). Type is derived from the
  kind of `Goal`. Provides `isActive(today)` (derived from the dates) and an
  `archiveOn(day)` method that returns a copy with `endDate = day`.
- **`Entry`** — entity: `id`, `habitId`, `day: Day`, `units` (>= 0).
- **`progress` domain service** — pure functions:
  - daily progress for a habit on a given day (done vs. target, %).
  - overall progress from a set of entries (total vs. target, %, optional
    pace vs. deadline: remaining units / remaining days).

Domain functions operate on domain objects and are trivially unit-testable
without any database.

## Persistence (infrastructure detail)

Relational schema owned by the SQLite adapters (not the domain):

```
habit
  id            INTEGER PRIMARY KEY
  name          TEXT NOT NULL
  type          TEXT NOT NULL CHECK (type IN ('daily', 'overall'))
  unit_minutes  INTEGER NOT NULL          -- length of one unit of work
  goal_units    INTEGER NOT NULL          -- daily target OR overall target
  start_date    TEXT                      -- ISO date, for overall habits
  end_date      TEXT                      -- ISO date deadline, optional
  created_at    TEXT NOT NULL

entry
  id            INTEGER PRIMARY KEY
  habit_id      INTEGER NOT NULL REFERENCES habit(id) ON DELETE CASCADE
  day           TEXT NOT NULL             -- ISO date (YYYY-MM-DD)
  units         INTEGER NOT NULL          -- units of work done that day
  UNIQUE(habit_id, day)
```

Notes:
- One `entry` row per (habit, day); recording again updates the count.
- `ON DELETE CASCADE` cleans entries when a habit is deleted.
- Repository adapters map rows <-> domain objects (mappers kept in infra).
- `start_date` is always set; `end_date` NULL means the habit has no deadline
  and is not archived. Archiving simply writes today's date into `end_date`.
- "Active" is not stored: it is computed from `start_date`/`end_date` vs. the
  `Clock`'s today, both in the domain and (where needed) via SQL predicates.

## Application layer (use cases)

Each use case is a small function/class taking its required ports + a plain
input DTO, returning a plain output DTO (never leaking domain objects to the
UI directly — the UI receives serialisable view data).

- `createHabit(input)` — validate + build `Habit`, persist.
- `recordEntry(input)` — add/subtract units for a habit on a day (upsert).
- `listHabitsWithProgress(today)` — active habits + computed progress.
- `getHabitDetail(id)` — habit + history + progress over time.
- `editHabit(input)` — update name/target/dates.
- `archiveHabit(id, today)` — set the habit's `endDate` to today via
  `habit.archiveOn(today)` and persist.
- `deleteHabit(id)` — remove the habit and its entries entirely.

## UI adapter (SvelteKit)

Driving adapter only — no business logic. Routes call use cases from
`server/app.ts` inside `load` functions and **form actions**.

- `/` — dashboard: active habits with today's progress + quick `+`/`-`
  unit controls.
- `/habits/new` — create-habit form.
- `/habits/[id]` — detail: history, progress, edit/archive/delete.

Human-friendly time formatting (units -> hours/minutes) lives as a UI/domain
formatting helper. daisyUI cards, progress bars/radials, mobile-friendly.

## Testing strategy

- **Domain**: pure unit tests (value objects, invariants, progress math) —
  fast, no I/O.
- **Application**: use-case tests against **in-memory fake repositories**
  (implementing the ports) — verifies orchestration without SQLite.
- **Infrastructure**: contract tests for SQLite repositories against a
  `:memory:` database, asserting they satisfy the port contracts.
- All under the existing `server` vitest project.

## Implementation steps

1. Scaffold layer folders; add `.gitignore` entry for the db file; decide db
   path (`data/habits.db`, overridable via `DATABASE_PATH`).
2. **Domain**: value objects (`UnitOfWork`, `Day`, `Goal`), entities
   (`Habit` with `startDate`/optional `endDate`, `isActive`, `archiveOn`;
   `Entry`), `progress` service, `errors` + unit tests.
3. **Application ports**: `HabitRepository`, `EntryRepository`, `Clock`.
4. **Application use cases** + DTOs + tests using in-memory fake repos.
5. **Infrastructure**: `database.ts` (node:sqlite) + `migrations.ts`.
6. SQLite repository adapters + mappers + contract tests (`:memory:`).
7. `system-clock.ts`, `container.ts` composition root, `server/app.ts`.
8. UI: dashboard route (load + record actions).
9. UI: create-habit route (form + action).
10. UI: habit detail route (history + edit/archive/delete).
11. Formatting helpers + daisyUI polish + navigation/layout.

## Open questions / future ideas

- Single-user (no auth) for now — assume local/self-hosted.
- Timezone handling: `Clock` port returns "today"; local date initially.
- Streaks, reminders, charts, CSV export — later.
- Could formalise use cases as classes with a shared `UseCase` interface if
  the surface grows.
