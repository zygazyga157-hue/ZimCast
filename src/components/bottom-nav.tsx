"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Tv, Trophy, User } from "lucide-react";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/live-tv", label: "Live TV", icon: Tv },
  { href: "/sports", label: "Sports", icon: Trophy },
  { href: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/80 backdrop-blur-xl pb-safe md:hidden">
      <div className="flex h-16 items-stretch">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname === tab.href ||
                pathname.startsWith(tab.href + "/");

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground active:text-foreground"
              }`}
            >
              {isActive && (
                <span className="gradient-accent absolute inset-x-4 top-0 h-0.5 rounded-full" />
              )}
              <tab.icon
                className={`h-5 w-5 ${isActive ? "fill-primary/20" : ""}`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
