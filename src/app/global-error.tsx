"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col items-center justify-center bg-[#0B0B0B] text-white px-4">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="mt-3 text-sm text-gray-400">
            An unexpected error occurred. Please try again.
          </p>
          {error.digest && (
            <p className="mt-2 text-xs text-gray-500">Error ID: {error.digest}</p>
          )}
          <div className="mt-8 flex justify-center gap-3">
            <button
              onClick={reset}
              className="rounded-lg bg-gradient-to-r from-[#FF416C] to-[#FF4B2B] px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Try Again
            </button>
            <Link
              href="/"
              className="rounded-lg border border-gray-700 px-6 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800"
            >
              Go Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
