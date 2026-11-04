"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, ShoppingCart, Package, Boxes, Users, Tag, FileText, Truck, MapPin,
  BarChart3, ScrollText, UsersRound, Settings, LogOut, Menu, X, ExternalLink,
} from "lucide-react";
import { adminLogoutAction } from "@/lib/admin/actions-core";
import type { AdminUser, PermissionKey } from "@/lib/admin-auth";
import { cn } from "@/lib/utils";

const NAV: { href: string; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; perm?: PermissionKey }[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart, perm: "orders" },
  { href: "/admin/products", label: "Products", icon: Package, perm: "catalog" },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes, perm: "inventory" },
  { href: "/admin/customers", label: "Customers", icon: Users, perm: "customers" },
  { href: "/admin/coupons", label: "Coupons", icon: Tag, perm: "marketing" },
  { href: "/admin/content", label: "Website content", icon: FileText, perm: "content" },
  { href: "/admin/shipping", label: "Shipping charges", icon: Truck, perm: "settings" },
  { href: "/admin/pincodes", label: "PIN serviceability", icon: MapPin, perm: "settings" },
  { href: "/admin/reports", label: "Reports & exports", icon: BarChart3, perm: "reports" },
  { href: "/admin/activity", label: "Activity log", icon: ScrollText, perm: "reports" },
  { href: "/admin/staff", label: "Team & roles", icon: UsersRound, perm: "staff" },
  { href: "/admin/settings", label: "Settings", icon: Settings, perm: "settings" },
];

export function AdminShell({ admin, children }: { admin: AdminUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = NAV.filter((n) => !n.perm || admin.role === "super" || admin.permissions.includes(n.perm));

  const navList = (
    <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 py-6">
      <ul className="space-y-1">
        {items.map((item) => {
          const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] font-medium transition-colors",
                  active ? "bg-gold/15 text-gold" : "text-ivory/60 hover:bg-ivory/5 hover:text-ivory",
                )}
              >
                <item.icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
                {item.label}
                {active ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gold" /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  return (
    <div className="min-h-svh bg-ivory lg:grid lg:grid-cols-[264px_1fr] print:block">
      {/* Sidebar — desktop */}
      <aside className="hidden bg-espresso text-ivory lg:flex lg:flex-col print:hidden">
        <Brand />
        {navList}
        <SidebarFoot admin={admin} />
      </aside>

      {/* Sidebar drawer — mobile */}
      <div className={cn("fixed inset-0 z-50 lg:hidden", open ? "" : "pointer-events-none")} aria-hidden={!open}>
        <div className={cn("absolute inset-0 bg-espresso/50 backdrop-blur-sm transition-opacity", open ? "opacity-100" : "opacity-0")} onClick={() => setOpen(false)} />
        <aside className={cn("absolute inset-y-0 left-0 flex w-72 flex-col bg-espresso text-ivory shadow-2xl transition-transform duration-300", open ? "translate-x-0" : "-translate-x-full")}>
          <div className="flex items-center justify-between pr-3">
            <Brand />
            <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="rounded-full p-2 text-ivory/70 hover:bg-ivory/10">
              <X className="h-5 w-5" strokeWidth={1.7} />
            </button>
          </div>
          {navList}
          <SidebarFoot admin={admin} />
        </aside>
      </div>

      {/* Main column */}
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b hairline-gold bg-ivory/90 px-4 backdrop-blur-md sm:px-6 print:hidden">
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Open menu" onClick={() => setOpen(true)} className="rounded-full p-2 text-espresso hover:bg-espresso/5 lg:hidden">
              <Menu className="h-5 w-5" strokeWidth={1.7} />
            </button>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-bronze">Atelier back office</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" target="_blank" className="inline-flex items-center gap-1.5 rounded-full border border-espresso/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-espresso/70 hover:border-bronze hover:text-bronze">
              View store <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.8} />
            </Link>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 border-b border-ivory/10 px-5 py-5">
      <span className="relative block h-10 w-10 overflow-hidden rounded-full bg-ivory p-0.5">
        <Image src="/images/logo.png" alt="" fill sizes="40px" className="rounded-full object-cover" />
      </span>
      <span>
        <span className="font-display block text-[15px] tracking-[0.16em]">PARADELLE</span>
        <span className="block text-[8.5px] font-semibold uppercase tracking-[0.32em] text-gold">Admin atelier</span>
      </span>
    </div>
  );
}

function SidebarFoot({ admin }: { admin: AdminUser }) {
  return (
    <div className="border-t border-ivory/10 px-4 py-4">
      <div className="flex items-center gap-3 px-2 pb-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/15 font-display text-sm text-gold">
          {admin.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-ivory">{admin.name}</p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-gold/80">{admin.role === "super" ? "Super Admin" : "Staff"}</p>
        </div>
      </div>
      <form action={adminLogoutAction}>
        <button type="submit" className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[13px] text-ivory/60 transition-colors hover:bg-ivory/5 hover:text-ivory">
          <LogOut className="h-4 w-4" strokeWidth={1.7} /> Sign out
        </button>
      </form>
    </div>
  );
}
