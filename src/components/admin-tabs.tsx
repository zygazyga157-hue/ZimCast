"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Trophy,
  Tv,
  Users,
  BarChart3,
  CreditCard,
  Repeat,
} from "lucide-react";

const tabs = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/matches", label: "Matches", icon: Trophy },
  { href: "/admin/programs", label: "Programs", icon: Tv },
  { href: "/admin/templates", label: "Templates", icon: Repeat },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
];

export function AdminTabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1">
      {tabs.map(({ href, label, icon: Icon }) => {
        const isActive =
          href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            className={`relative flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="admin-tab-bg"
                className="absolute inset-0 rounded-md gradient-accent opacity-15"
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5" />
              {label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
