"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { registerAction, loginAction, type AuthState } from "@/lib/actions";
import { Field, inputClass } from "@/components/ui";
import { arrowButton } from "@/components/auth-button-helpers";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const action = mode === "login" ? loginAction : registerAction;
  const [state, formAction] = useActionState<AuthState, FormData>(action, null);

  return (
    <form action={formAction} className="space-y-5">
      {mode === "register" ? (
        <Field label="Full name">
          <input name="name" required minLength={2} autoComplete="name" className={inputClass} placeholder="Aanya Sharma" />
        </Field>
      ) : null}
      <Field label="Email">
        <input name="email" type="email" required autoComplete="email" inputMode="email" className={inputClass} placeholder="you@email.com" />
      </Field>
      <Field label="Password" hint={mode === "register" ? "min. 8 characters" : undefined}>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          className={inputClass}
          placeholder="••••••••"
        />
      </Field>

      {state?.error ? (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{state.error}</p>
      ) : null}

      <Submit mode={mode} />

      <p className="text-center text-[13px] text-espresso/55">
        {mode === "login" ? (
          <>New to the maison? <Link href="/register" className="font-medium text-bronze underline-offset-4 hover:underline">Create an account</Link></>
        ) : (
          <>Already a member? <Link href="/login" className="font-medium text-bronze underline-offset-4 hover:underline">Sign in</Link></>
        )}
      </p>
      <p className="text-center text-[12px] text-espresso/40">
        Prefer not to register? <Link href="/checkout" className="text-bronze underline-offset-4 hover:underline">Guest checkout</Link> is always available.
      </p>
    </form>
  );
}

function Submit({ mode }: { mode: "login" | "register" }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={arrowButton}
    >
      {pending ? "One moment…" : mode === "login" ? "Sign in" : "Create account"}
    </button>
  );
}
