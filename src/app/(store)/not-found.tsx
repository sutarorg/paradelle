import Link from "next/link";
import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-4 py-24 text-center">
      <p className="font-display text-7xl text-gold lg:text-8xl">404</p>
      <h1 className="font-display mt-4 text-3xl text-espresso lg:text-4xl">This page has melted away</h1>
      <p className="mt-4 max-w-md text-[15px] leading-relaxed text-espresso/60">
        The link may be old, or the page moved — like chocolate left in the sun. The collection, however, is exactly where
        it should be.
      </p>
      <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
        <ButtonLink href="/collection" variant="espresso">Explore the collection</ButtonLink>
        <Link href="/" className="text-[12px] font-semibold uppercase tracking-[0.2em] text-bronze underline-offset-4 hover:underline">Return home</Link>
      </div>
    </div>
  );
}
