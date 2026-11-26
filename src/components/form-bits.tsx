"use client";

export function FormMessage({ state }: { state: { error?: string; ok?: string } | undefined }) {
  if (state?.error) return <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{state.error}</p>;
  if (state?.ok) return <p className="rounded-xl bg-green-50 p-3 text-sm text-green-800">{state.ok}</p>;
  return null;
}
