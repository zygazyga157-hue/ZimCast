import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4">
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-6xl font-bold gradient-text">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/"
            className="gradient-accent rounded-lg border-0 px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Go Home
          </Link>
          <Link
            href="/sports"
            className="rounded-lg border border-border px-6 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"
          >
            Browse Sports
          </Link>
        </div>
      </div>
    </div>
  );
}
