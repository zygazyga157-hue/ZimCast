"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, Tv, Trophy, BarChart3, User } from "lucide-react";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/live-tv", label: "Live TV", icon: Tv },
  { href: "/sports", label: "Sports", icon: Trophy },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-4 bottom-3 z-50 rounded-2xl border border-border bg-card/90 shadow-lg shadow-black/30 backdrop-blur-xl pb-safe md:hidden">
      <div className="flex h-16 items-stretch px-1">
        {tabs.map((tab, idx) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname === tab.href ||
                pathname.startsWith(tab.href + "/");

          const isCenter = idx === Math.floor(tabs.length / 2);

          return (
            <motion.div
              key={tab.href}
              whileTap={{ scale: 0.88 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="relative flex flex-1 items-center justify-center"
            >
              <Link
                href={tab.href}
                className={`relative flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[9px] font-medium leading-none transition-colors ${
                  isCenter && !isActive ? "-translate-y-0.5" : ""
                } ${
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="bottom-nav-pill"
                    className="gradient-accent absolute inset-0 rounded-xl opacity-15"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <tab.icon
                  className={`relative h-5 w-5 ${isActive ? "fill-foreground/20" : ""}`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className="relative">{tab.label}</span>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </nav>
  );
}
