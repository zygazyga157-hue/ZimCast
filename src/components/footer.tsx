import Link from "next/link";

export function Footer() {
  return (
    <footer className="hidden md:block border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="gradient-accent flex h-6 w-6 items-center justify-center rounded text-xs font-bold text-white">
              Z
            </div>
            <span className="text-sm font-semibold">ZimCast</span>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/sports" className="hover:text-foreground transition-colors">
              Sports
            </Link>
            <Link href="/live-tv" className="hover:text-foreground transition-colors">
              Live TV
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} ZimCast. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
