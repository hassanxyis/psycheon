/**
 * Shapes and initial values for Server Action results.
 *
 * These live here rather than beside the actions they describe because a
 * `"use server"` file may export **only async functions**. A type export is
 * erased at compile time and so is harmless, but a `const` object is not:
 * exporting one makes Next throw
 *
 *   A "use server" file can only export async functions, found object
 *
 * at module evaluation -- which takes down the whole page that imports any
 * action from that file, not just the code touching the constant. The failure
 * is also invisible to `tsc` and to `next build`, because it is a runtime rule
 * about the module graph rather than a type error.
 *
 * Actions return one of these instead of throwing, so a failure can be rendered
 * next to the field that caused it. See the "Route layout" section of CLAUDE.md.
 */

/** Admin and booking actions: an error to show, or a success message to toast. */
export type AdminActionState = { error: string | null; message: string | null };

export type BookingActionState = AdminActionState;

/** Community actions, which have no success message -- they redirect or refresh. */
export type ActionState = { error: string | null };

/**
 * The `initialState` passed to `useActionState`, and the first argument when an
 * action is called directly inside a transition.
 *
 * Frozen because a single shared object is handed to every form on the page: a
 * caller that mutated it would change the starting state of all the others.
 */
export const emptyAdminState: AdminActionState = Object.freeze({
  error: null,
  message: null,
});

export const emptyBookingState: BookingActionState = emptyAdminState;
