import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

/** Phase 2 admin design kit — quiet luxury: ivory surfaces, espresso ink, gold accents. */

export function PageHeader({
  title,
  sub,
  actions,
}: {
  title: string;
  sub?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-[26px] leading-tight text-espresso lg:text-3xl">{title}</h1>
        {sub ? <p className="mt-1 text-[13px] text-espresso/55">{sub}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
    </div>
  );
}

export function Flash({ ok, error }: { ok?: string | null; error?: string | null }) {
  if (!ok && !error) return null;
  return (
    <div
      role="status"
      className={cn(
        "mb-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
        ok ? "border-bronze/30 bg-gold/10 text-espresso" : "border-red-800/20 bg-red-50 text-red-900",
      )}
    >
      {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-bronze" strokeWidth={2} /> : <AlertCircle className="mt-0.5 h-4 w-4" strokeWidth={2} />}
      <p>{ok ?? error}</p>
    </div>
  );
}

export function StatCard({ label, value, hint, icon: Icon }: { label: string; value: string; hint?: string; icon?: React.ComponentType<{ className?: string; strokeWidth?: number }> }) {
  return (
    <div className="rounded-2xl border border-espresso/8 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-espresso/50">{label}</p>
        {Icon ? <Icon className="h-4.5 w-4.5 text-bronze/70" strokeWidth={1.7} /> : null}
      </div>
      <p className="font-display mt-2.5 text-[26px] leading-none tabular-nums text-espresso lg:text-3xl">{value}</p>
      {hint ? <p className="mt-1.5 text-[12px] text-espresso/45">{hint}</p> : null}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  payment_pending: "bg-gold/15 text-bronze border-gold/40",
  paid: "bg-emerald-900/8 text-emerald-900 border-emerald-900/20",
  crafting: "bg-plum/8 text-plum border-plum/20",
  shipped: "bg-bronze/10 text-bronze border-bronze/25",
  delivered: "bg-emerald-900/8 text-emerald-900 border-emerald-900/20",
  cancelled: "bg-red-900/8 text-red-900 border-red-900/20",
  active: "bg-emerald-900/8 text-emerald-900 border-emerald-900/20",
  draft: "bg-espresso/5 text-espresso/60 border-espresso/15",
  archived: "bg-espresso/5 text-espresso/40 border-espresso/10",
  requested: "bg-gold/15 text-bronze border-gold/40",
  processed: "bg-emerald-900/8 text-emerald-900 border-emerald-900/20",
  rejected: "bg-red-900/8 text-red-900 border-red-900/20",
  created: "bg-espresso/5 text-espresso/60 border-espresso/15",
  captured: "bg-emerald-900/8 text-emerald-900 border-emerald-900/20",
  verified: "bg-emerald-900/8 text-emerald-900 border-emerald-900/20",
  unverified: "bg-espresso/5 text-espresso/50 border-espresso/12",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em]", STATUS_STYLES[status] ?? "bg-espresso/5 text-espresso/60 border-espresso/15")}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export const adminInput =
  "w-full rounded-xl border border-espresso/15 bg-white px-3.5 py-2.5 text-sm text-espresso placeholder:text-espresso/35 outline-none transition-colors focus:border-bronze";

export function AdminField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between text-[11.5px] font-semibold uppercase tracking-[0.14em] text-espresso/60">
        {label}
        {hint ? <span className="text-[10.5px] font-normal normal-case tracking-normal text-espresso/40">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

export const adminBtn =
  "inline-flex items-center justify-center gap-2 rounded-full border border-espresso bg-espresso px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-ivory transition-colors hover:bg-plum hover:border-plum active:translate-y-px disabled:opacity-50";

export const adminBtnGhost =
  "inline-flex items-center justify-center gap-2 rounded-full border border-espresso/20 bg-white px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-espresso/75 transition-colors hover:border-bronze hover:text-bronze active:translate-y-px";

export const adminBtnGold =
  "inline-flex items-center justify-center gap-2 rounded-full border border-gold bg-gold px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-espresso transition-colors hover:bg-transparent hover:text-bronze active:translate-y-px";

export const adminBtnDanger =
  "inline-flex items-center justify-center gap-2 rounded-full border border-red-900/25 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-red-900 transition-colors hover:bg-red-50 active:translate-y-px";

export const tableShell = "overflow-x-auto rounded-2xl border border-espresso/8 bg-white";
export const tableClass = "w-full min-w-[640px] text-left text-sm";
export const thClass = "border-b border-espresso/10 bg-cream/60 px-4 py-3 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-espresso/55";
export const tdClass = "border-b border-espresso/6 px-4 py-3.5 text-[13.5px] text-espresso/80 align-middle";

export function EmptyState({ icon: Icon, title, text, action }: { icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-espresso/15 bg-white px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-cream text-bronze">
        {Icon ? <Icon className="h-5.5 w-5.5" strokeWidth={1.5} /> : <Inbox className="h-5.5 w-5.5" strokeWidth={1.5} />}
      </span>
      <p className="font-display mt-4 text-xl text-espresso">{title}</p>
      {text ? <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-espresso/55">{text}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
