import Link from "next/link";
import { Tv, Shield, Zap } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Secure Streaming",
    description: "Token-authenticated HLS streams with end-to-end protection.",
  },
  {
    icon: Zap,
    title: "Instant Access",
    description: "Pay with EcoCash and start watching in seconds.",
  },
  {
    icon: Tv,
    title: "Live TV & Sports",
    description: "ZTV, Premier League, and local matches — all in one place.",
  },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh">
      {/* Left branding panel — hidden on mobile */}
      <div className="relative hidden w-[480px] shrink-0 overflow-hidden bg-gradient-to-br from-[#FF416C] to-[#FF4B2B] md:flex md:flex-col lg:w-[520px]">
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Floating glow orbs */}
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-orb auth-orb-3" />

        {/* Content */}
        <div className="relative z-10 flex flex-1 flex-col justify-between p-10 lg:p-12">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-lg font-bold text-white backdrop-blur-sm">
              Z
            </div>
            <span className="text-xl font-bold text-white tracking-tight">
              ZimCast
            </span>
          </Link>

          {/* Tagline + Features */}
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-white leading-tight lg:text-4xl">
                Stream live from
                <br />
                Zimbabwe
              </h2>
              <p className="mt-3 text-white/70 text-sm leading-relaxed max-w-[320px]">
                Watch live sports, ZTV, and exclusive content. Pay per match —
                no subscriptions, no contracts.
              </p>
            </div>

            <div className="space-y-4">
              {features.map((f) => (
                <div key={f.title} className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
                    <f.icon className="h-4.5 w-4.5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {f.title}
                    </p>
                    <p className="text-xs text-white/60 leading-relaxed">
                      {f.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom quote */}
          <p className="text-xs text-white/40">
            &copy; {new Date().getFullYear()} ZimCast. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 flex-col">
        {/* Mobile top bar (shown only on small screens) */}
        <div className="flex items-center gap-2 p-4 md:hidden">
          <Link href="/" className="flex items-center gap-2">
            <div className="gradient-accent flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white">
              Z
            </div>
            <span className="text-lg font-bold tracking-tight">ZimCast</span>
          </Link>
        </div>

        {/* Centered form area */}
        <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-8">
          {children}
        </div>
      </div>
    </div>
  );
}
