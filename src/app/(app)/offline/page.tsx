"use client";

import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-yellow-500/20 bg-yellow-500/10">
          <WifiOff className="h-7 w-7 text-yellow-400" />
        </div>
        <h1 className="text-2xl font-bold">You&apos;re Offline</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Check your internet connection and try again.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button
            onClick={() => window.location.reload()}
            className="gradient-accent border-0 text-white"
          >
            Retry
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">Go Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
