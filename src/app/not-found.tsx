import Link from "next/link";

export default function RootNotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-ivory px-4 py-24 text-center">
      <p className="font-display text-7xl text-gold">404</p>
      <h1 className="font-display mt-4 text-3xl text-espresso">This page has melted away</h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-espresso/60">The link may be old or mistyped.</p>
      <div className="mt-8 flex gap-4">
        <Link href="/" className="rounded-full bg-espresso px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-ivory">Storefront</Link>
        <Link href="/admin" className="rounded-full border border-espresso/25 px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-espresso">Admin</Link>
      </div>
    </div>
  );
}
