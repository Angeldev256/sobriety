import type { ActionState } from "@/lib/validations";

export function FieldError({ state, name }: { state: ActionState; name: string }) {
  const msg = state?.fieldErrors?.[name]?.[0];
  if (!msg) return null;
  return (
    <p id={`${name}-error`} className="field-error" role="alert">
      {msg}
    </p>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (!state?.message) return null;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      className={`border-l-2 py-1 pl-3 text-sm ${state.ok ? "border-primary text-fg" : "border-danger text-danger"}`}
    >
      {state.message}
    </p>
  );
}
