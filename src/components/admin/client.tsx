"use client";

import { useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { adminBtn, adminBtnDanger, adminBtnGhost, adminInput } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

/** Small client-side widgets used across admin forms. */

export function PendingButton({ children, className, confirm }: { children: ReactNode; className?: string; confirm?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      data-confirm={confirm}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className={cn(adminBtn, className)}
    >
      {pending ? "Working…" : children}
    </button>
  );
}

export function DeleteButton({ label = "Delete", confirm }: { label?: string; confirm: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(confirm)) e.preventDefault();
      }}
      className={adminBtnDanger}
    >
      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} /> {pending ? "…" : label}
    </button>
  );
}

/* ————— FAQ editor (serialises to a hidden JSON field) ————— */

type Faq = { q: string; a: string };

export function FaqsEditor({ initial }: { initial: Faq[] }) {
  const [rows, setRows] = useState<Faq[]>(initial);
  return (
    <div className="space-y-4">
      <input type="hidden" name="faqsJson" value={JSON.stringify(rows)} />
      {rows.map((f, i) => (
        <div key={i} className="rounded-2xl border border-espresso/10 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <span className="font-display text-espresso/40">Q{i + 1}</span>
            <div className="flex gap-1.5">
              <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => setRows(swap(rows, i, -1))} className="rounded-lg border border-espresso/15 p-1.5 text-espresso/60 hover:border-bronze disabled:opacity-30">
                <ArrowUp className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
              <button type="button" aria-label="Move down" disabled={i === rows.length - 1} onClick={() => setRows(swap(rows, i, 1))} className="rounded-lg border border-espresso/15 p-1.5 text-espresso/60 hover:border-bronze disabled:opacity-30">
                <ArrowDown className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
              <button type="button" aria-label="Remove" onClick={() => setRows(rows.filter((_, j) => j !== i))} className="rounded-lg border border-red-900/20 p-1.5 text-red-900 hover:bg-red-50">
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
              </button>
            </div>
          </div>
          <input value={f.q} onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, q: e.target.value } : r)))} placeholder="Question" className={cn(adminInput, "mt-2 font-medium")} />
          <textarea value={f.a} onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, a: e.target.value } : r)))} placeholder="Answer" rows={3} className={cn(adminInput, "mt-2")} />
        </div>
      ))}
      <button type="button" onClick={() => setRows([...rows, { q: "", a: "" }])} className={adminBtnGhost}>
        <Plus className="h-4 w-4" strokeWidth={2} /> Add question
      </button>
      <div>
        <PendingButton>Publish FAQs</PendingButton>
      </div>
    </div>
  );
}

/* ————— Policy editor (heading + paragraphs per section; blank line = new paragraph) ————— */

type PolicySection = { heading: string; body: string };

export function PolicyEditor({ policyKey, initial }: { policyKey: string; initial: { heading: string; body: string[] }[] }) {
  const [rows, setRows] = useState<PolicySection[]>(initial.map((s) => ({ heading: s.heading, body: s.body.join("\n\n") })));
  return (
    <div className="space-y-4">
      <input type="hidden" name="policy" value={policyKey} />
      <input type="hidden" name="policyJson" value={JSON.stringify(rows)} />
      {rows.map((s, i) => (
        <div key={i} className="rounded-2xl border border-espresso/10 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <span className="font-display text-espresso/40">§{i + 1}</span>
            <div className="flex gap-1.5">
              <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => setRows(swap(rows, i, -1))} className="rounded-lg border border-espresso/15 p-1.5 text-espresso/60 hover:border-bronze disabled:opacity-30">
                <ArrowUp className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
              <button type="button" aria-label="Move down" disabled={i === rows.length - 1} onClick={() => setRows(swap(rows, i, 1))} className="rounded-lg border border-espresso/15 p-1.5 text-espresso/60 hover:border-bronze disabled:opacity-30">
                <ArrowDown className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
              <button type="button" aria-label="Remove section" onClick={() => setRows(rows.filter((_, j) => j !== i))} className="rounded-lg border border-red-900/20 p-1.5 text-red-900 hover:bg-red-50">
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
              </button>
            </div>
          </div>
          <input value={s.heading} onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, heading: e.target.value } : r)))} placeholder="Section heading" className={cn(adminInput, "mt-2 font-medium")} />
          <textarea value={s.body} onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, body: e.target.value } : r)))} placeholder={"Section text. Separate paragraphs with a blank line."} rows={4} className={cn(adminInput, "mt-2")} />
        </div>
      ))}
      <button type="button" onClick={() => setRows([...rows, { heading: "", body: "" }])} className={adminBtnGhost}>
        <Plus className="h-4 w-4" strokeWidth={2} /> Add section
      </button>
      <div>
        <PendingButton>Publish policy</PendingButton>
      </div>
    </div>
  );
}

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={adminBtn}>
      Print invoice
    </button>
  );
}

function swap<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const next = [...arr];
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
