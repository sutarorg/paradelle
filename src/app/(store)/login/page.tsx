import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getSessionUser } from "@/lib/auth";
import { Kicker } from "@/components/ui";
import { Reveal } from "@/components/reveal";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/account");

  return (
    <div className="mx-auto max-w-md px-4 pb-24 pt-16 sm:px-6">
      <Reveal>
        <div className="text-center">
          <Kicker className="justify-center">Welcome back</Kicker>
          <h1 className="font-display mt-3 text-4xl text-espresso">Sign in</h1>
          <p className="mt-3 text-[14px] text-espresso/60">Track orders, check out faster, keep your favourites close.</p>
        </div>
      </Reveal>
      <Reveal delay={120}>
        <div className="mt-9 rounded-3xl border hairline-gold bg-ivory p-7 shadow-[0_30px_60px_-45px_rgba(41,24,19,0.4)] sm:p-9">
          <AuthForm mode="login" />
        </div>
      </Reveal>
    </div>
  );
}
