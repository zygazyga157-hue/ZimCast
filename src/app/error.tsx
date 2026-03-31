"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-destructive/20 bg-destructive/10">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          An unexpected error occurred while loading this page.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-muted-foreground/60">
            Error ID: {error.digest}
          </p>
        )}
        <div className="mt-8 flex justify-center gap-3">
          <button
            onClick={reset}
            className="gradient-accent rounded-lg border-0 px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="rounded-lg border border-border px-6 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
