import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/login-form";
import { getAdmin } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const admin = await getAdmin();
  if (admin) redirect("/admin");

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-espresso px-4 py-16 text-ivory">
      <div className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-plum/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-gold/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <span className="relative block h-16 w-16 overflow-hidden rounded-full bg-ivory p-1 shadow-xl">
            <Image src="/images/logo.png" alt="" fill sizes="64px" className="rounded-full object-cover" />
          </span>
          <p className="font-display mt-5 text-2xl tracking-[0.16em]">PARADELLE</p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.34em] text-gold">Admin atelier · staff only</p>
        </div>

        <div className="mt-9 rounded-3xl border border-ivory/10 bg-ivory p-7 text-espresso shadow-2xl sm:p-9">
          <AdminLoginForm />
          <p className="mt-6 text-center text-[12px] leading-relaxed text-espresso/45">
            Access is granted by a Super Admin — there is no public registration. All activity is logged.
          </p>
        </div>
      </div>
    </div>
  );
}
