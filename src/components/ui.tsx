import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Small gold letterspaced eyebrow label. */
export function Kicker({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("text-[11px] font-semibold uppercase tracking-[0.32em] text-bronze", className)}>{children}</p>
  );
}

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-[13px] font-semibold uppercase tracking-[0.18em] transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-50";

const v = {
  espresso:
    "bg-espresso text-ivory border border-espresso hover:bg-plum hover:border-plum active:translate-y-px",
  gold: "bg-gold text-espresso border border-gold hover:bg-transparent hover:text-gold active:translate-y-px",
  outlineGold:
    "bg-transparent text-gold border border-gold/60 hover:bg-gold hover:text-espresso active:translate-y-px",
  outlineDark:
    "bg-transparent text-espresso border border-espresso/40 hover:border-espresso hover:bg-espresso hover:text-ivory active:translate-y-px",
} as const;

type Variant = keyof typeof v;

export function Button({
  variant = "espresso",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={cn(buttonBase, v[variant], className)} {...props} />;
}

export function ButtonLink({
  variant = "espresso",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cn(buttonBase, v[variant], className)} {...props} />;
}

export const inputClass =
  "w-full rounded-xl border border-espresso/15 bg-cream px-4 py-3 text-[15px] text-espresso placeholder:text-espresso/35 outline-none transition-colors focus:border-bronze focus:bg-white";

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between text-[12px] font-semibold uppercase tracking-[0.14em] text-espresso/70">
        {label}
        {hint ? <span className="text-[11px] font-normal normal-case tracking-normal text-espresso/45">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}
