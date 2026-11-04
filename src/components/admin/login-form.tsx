"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Lock } from "lucide-react";
import { adminLoginAction, type AdminAuthState } from "@/lib/admin/actions-core";
import { AdminField, adminInput } from "@/components/admin/ui";

export function AdminLoginForm() {
  const [state, formAction] = useActionState<AdminAuthState, FormData>(adminLoginAction, null);
  return (
    <form action={formAction} className="space-y-5">
      <AdminField label="Email">
        <input name="email" type="email" required autoComplete="email" className={adminInput} placeholder="you@paradelle.store" />
      </AdminField>
      <AdminField label="Password">
        <input name="password" type="password" required autoComplete="current-password" className={adminInput} placeholder="••••••••" />
      </AdminField>
      {state?.error ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{state.error}</p> : null}
      <Submit />
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-full border border-gold bg-gold px-7 py-3.5 text-[13px] font-semibold uppercase tracking-[0.18em] text-espresso transition-all duration-300 hover:bg-transparent hover:text-gold active:translate-y-px disabled:opacity-60"
    >
      <Lock className="h-4 w-4" strokeWidth={1.8} />
      {pending ? "Signing in…" : "Enter the atelier"}
    </button>
  );
}
