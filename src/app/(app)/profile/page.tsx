"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  User,
  Ticket,
  Calendar,
  Save,
  CheckCircle2,
  Mail,
  ShieldCheck,
  Check,
  Clock,
  Trophy,
  Activity,
  MapPin,
  Languages,
  Upload,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PageTransition } from "@/components/page-transition";
import { api, showApiError } from "@/lib/api";
import { ProfileAvatar } from "@/components/profile-avatar";
import { toast } from "sonner";

const INTEREST_OPTIONS = [
  "Sports",
  "News",
  "Entertainment",
  "Music",
  "Documentary",
  "Gaming",
  "Travel",
  "Food",
  "Tech",
  "Fashion",
  "Fitness",
  "Art",
] as const;

const LANGUAGE_OPTIONS = ["English", "Shona", "Ndebele"] as const;

interface Profile {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  city: string | null;
  country: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  emailVerified: boolean;
  interests: string[];
  language: string;
}

interface Pass {
  id: string;
  matchId: string;
  expiresAt: string;
  passStart?: string;
  passEnd?: string;
  passState?: string;
  phase?: string;
  match: {
    homeTeam: string;
    awayTeam: string;
    kickoff: string;
    isLive: boolean;
  };
}

type MediaKind = "avatar" | "banner";

const MEDIA_ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MEDIA_MAX_BYTES: Record<MediaKind, number> = {
  avatar: 2 * 1024 * 1024,
  banner: 5 * 1024 * 1024,
};

interface AnalyticsData {
  totalWatchTime: number;
  favoriteCategory: string | null;
  topPrograms: { title: string; totalTime: number }[];
  engagementScore: number;
  weeklyHeatmap: number[][];
  categoryBreakdown: Record<string, number>;
  recentActivity: {
    id: string;
    action: string;
    watchDuration: number;
    title: string | null;
    category: string | null;
    createdAt: string;
  }[];
  insights: string[];
  peakTime: number | null;
  totalMatches: number;
}

function formatWatchTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function ProfilePage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [passes, setPasses] = useState<Pass[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [resending, setResending] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [language, setLanguage] = useState("English");

  // Dirty-state detection: compare current form values against loaded profile
  const isDirty = useMemo(() => {
    if (!profile) return false;
    return (
      name !== (profile.name ?? "") ||
      phone !== (profile.phone ?? "") ||
      dateOfBirth !== (profile.dateOfBirth ? profile.dateOfBirth.split("T")[0] : "") ||
      gender !== (profile.gender ?? "") ||
      city !== (profile.city ?? "") ||
      country !== (profile.country ?? "") ||
      language !== (profile.language ?? "English") ||
      JSON.stringify([...interests].sort()) !==
        JSON.stringify([...(profile.interests ?? [])].sort())
    );
  }, [profile, name, phone, dateOfBirth, gender, city, country, interests, language]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login");
      return;
    }

    // Fetch profile, passes, and analytics eagerly in parallel
    Promise.all([
      api<Profile>("/api/user/profile"),
      api<Pass[]>("/api/user/passes"),
      api<AnalyticsData>("/api/user/analytics").catch(() => null),
    ])
      .then(([profileData, passesData, analyticsData]) => {
        setProfile(profileData);
        setName(profileData.name ?? "");
        setPhone(profileData.phone ?? "");
        setDateOfBirth(profileData.dateOfBirth ? profileData.dateOfBirth.split("T")[0] : "");
        setGender(profileData.gender ?? "");
        setCity(profileData.city ?? "");
        setCountry(profileData.country ?? "");
        setInterests(profileData.interests ?? []);
        setLanguage(profileData.language ?? "English");
        setPasses(passesData ?? []);
        if (analyticsData) setAnalytics(analyticsData);
      })
      .catch((err) => showApiError(err, "Failed to load profile"))
      .finally(() => setLoading(false));
  }, [session, status, router]);

  useEffect(() => {
    if (searchParams.get("verified") === "true") {
      toast.success("Email verified successfully!");
      void updateSession({ reason: "verified" });
    }
  }, [searchParams, updateSession]);

  function toggleInterest(interest: string) {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  }

  const uploadMedia = useCallback(
    async (kind: MediaKind, file: File) => {
      if (!MEDIA_ALLOWED_TYPES.has(file.type)) {
        toast.error("Unsupported file type. Please upload a PNG, JPG, or WebP.");
        return;
      }

      const maxBytes = MEDIA_MAX_BYTES[kind];
      if (file.size > maxBytes) {
        const mb = Math.round(maxBytes / 1024 / 1024);
        toast.error(`File is too large. Max size is ${mb}MB.`);
        return;
      }

      if (kind === "avatar") setAvatarUploading(true);
      else setBannerUploading(true);

      try {
        const presign = await api<{
          key: string;
          uploadUrl: string;
          publicUrl: string | null;
        }>("/api/user/media/presign", {
          method: "POST",
          body: { kind, contentType: file.type },
        });

        const putRes = await fetch(presign.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!putRes.ok) {
          throw new Error("Upload failed");
        }

        const committed = await api<{
          avatarUrl: string | null;
          bannerUrl: string | null;
        }>("/api/user/media/commit", {
          method: "POST",
          body: { kind, key: presign.key },
        });

        setProfile((prev) =>
          prev
            ? {
                ...prev,
                avatarUrl: committed.avatarUrl ?? prev.avatarUrl,
                bannerUrl: committed.bannerUrl ?? prev.bannerUrl,
              }
            : prev
        );

        if (kind === "avatar") {
          await updateSession({ reason: "avatar" });
          toast.success("Profile photo updated");
        } else {
          toast.success("Banner updated");
        }
      } catch (err) {
        showApiError(err, kind === "avatar" ? "Failed to update profile photo" : "Failed to update banner");
      } finally {
        if (kind === "avatar") setAvatarUploading(false);
        else setBannerUploading(false);

        // Reset inputs so selecting the same file again triggers onChange
        if (kind === "avatar" && avatarInputRef.current) avatarInputRef.current.value = "";
        if (kind === "banner" && bannerInputRef.current) bannerInputRef.current.value = "";
      }
    },
    [updateSession]
  );

  const removeMedia = useCallback(
    async (kind: MediaKind) => {
      if (kind === "avatar") setAvatarUploading(true);
      else setBannerUploading(true);

      try {
        await api("/api/user/media", { method: "DELETE", body: { kind } });

        setProfile((prev) =>
          prev
            ? {
                ...prev,
                avatarUrl: kind === "avatar" ? null : prev.avatarUrl,
                bannerUrl: kind === "banner" ? null : prev.bannerUrl,
              }
            : prev
        );

        if (kind === "avatar") {
          await updateSession({ reason: "avatar_remove" });
          toast.success("Profile photo removed");
        } else {
          toast.success("Banner removed");
        }
      } catch (err) {
        showApiError(err, kind === "avatar" ? "Failed to remove profile photo" : "Failed to remove banner");
      } finally {
        if (kind === "avatar") setAvatarUploading(false);
        else setBannerUploading(false);
      }
    },
    [updateSession]
  );

  const onAvatarFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      void uploadMedia("avatar", file);
    },
    [uploadMedia]
  );

  const onBannerFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      void uploadMedia("banner", file);
    },
    [uploadMedia]
  );

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    try {
      const updated = await api<Profile>("/api/user/profile", {
        method: "PATCH",
        body: {
          name: name || undefined,
          phone: phone || undefined,
          dateOfBirth: dateOfBirth || undefined,
          gender: gender || undefined,
          city: city || undefined,
          country: country || undefined,
          interests,
          language,
        },
      });
      setProfile((prev) => (prev ? { ...prev, ...updated } : prev));
      setSaved(true);
      toast.success("Profile updated");
      await updateSession({ reason: "profile_save" });
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      showApiError(err, "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleResendVerification() {
    setResending(true);
    try {
      await api("/api/auth/resend-verify", { method: "POST" });
      toast.success("Verification email sent! Check your inbox.");
    } catch (err) {
      showApiError(err, "Failed to send verification email");
    } finally {
      setResending(false);
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activePasses = passes.filter(
    (p) => new Date(p.expiresAt) > new Date()
  );
  const expiredPasses = passes.filter(
    (p) => new Date(p.expiresAt) <= new Date()
  );

  const topCategories = analytics
    ? Object.entries(analytics.categoryBreakdown)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 4)
    : [];

  return (
    <PageTransition>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* ─── 1. Profile Hero ─── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-2xl border border-border bg-card"
        >
          {/* Banner background */}
          <div className="relative h-28 w-full overflow-hidden">
            {profile?.bannerUrl ? (
              <>
                <img
                  src={profile.bannerUrl}
                  alt="Profile banner"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/60" />
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-card to-accent/10" />
            )}

            <div className="absolute right-3 top-3 flex items-center gap-2">
              <Button
                type="button"
                size="xs"
                variant="secondary"
                disabled={bannerUploading}
                onClick={() => bannerInputRef.current?.click()}
                className="bg-background/60 hover:bg-background/70"
              >
                {bannerUploading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Upload className="h-3 w-3" />
                )}
                {profile?.bannerUrl ? "Change" : "Add Banner"}
              </Button>
              {profile?.bannerUrl && (
                <Button
                  type="button"
                  size="xs"
                  variant="secondary"
                  disabled={bannerUploading}
                  onClick={() => void removeMedia("banner")}
                  className="bg-background/60 hover:bg-background/70"
                >
                  <Trash2 className="h-3 w-3" />
                  Remove
                </Button>
              )}
            </div>

            {/* Hidden inputs */}
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={onBannerFileChange}
            />
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={onAvatarFileChange}
            />
          </div>

          {/* Avatar overlapping banner */}
          <div className="relative px-6 pb-6">
            <div className="-mt-14 flex flex-col items-center sm:flex-row sm:items-end sm:gap-5">
              <div className="shrink-0">
                <div className="relative">
                  <ProfileAvatar
                    avatarUrl={profile?.avatarUrl}
                    name={profile?.name}
                    email={profile?.email}
                    interests={profile?.interests}
                    animated
                    size="lg"
                    className="h-24 w-24 ring-4 ring-card sm:h-28 sm:w-28"
                  />

                  <div className="absolute -bottom-1 -right-1 flex items-center gap-1">
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="secondary"
                      disabled={avatarUploading}
                      onClick={() => avatarInputRef.current?.click()}
                      className="rounded-full shadow-sm bg-background/70 hover:bg-background/80"
                      aria-label="Change profile photo"
                    >
                      {avatarUploading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Upload className="h-3 w-3" />
                      )}
                    </Button>

                    {profile?.avatarUrl && (
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="secondary"
                        disabled={avatarUploading}
                        onClick={() => void removeMedia("avatar")}
                        className="rounded-full shadow-sm bg-background/70 hover:bg-background/80"
                        aria-label="Remove profile photo"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 min-w-0 text-center sm:mb-1 sm:text-left">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {profile?.name || "Your Profile"}
                </h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {profile?.email}
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  {profile?.emailVerified ? (
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px]">
                      <ShieldCheck className="mr-1 h-3 w-3" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-[10px]">
                      Unverified
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Email verification banner */}
        {profile && !profile.emailVerified && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3"
          >
            <Mail className="h-5 w-5 shrink-0 text-amber-500" />
            <p className="flex-1 text-sm text-amber-200">
              Verify your email for the full ZimCast experience.
            </p>
            <Button
              size="sm"
              variant="outline"
              disabled={resending}
              onClick={handleResendVerification}
              className="shrink-0 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
            >
              {resending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "Resend"
              )}
            </Button>
          </motion.div>
        )}

        {profile?.emailVerified && searchParams.get("verified") === "true" && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3"
          >
            <ShieldCheck className="h-5 w-5 text-green-400" />
            <p className="text-sm text-green-300">
              Your email has been verified!
            </p>
          </motion.div>
        )}

        {/* ─── 2. Quick Stats Bar ─── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="grid grid-cols-4 gap-3"
        >
          {[
            {
              icon: Ticket,
              label: "Passes",
              value: activePasses.length,
            },
            {
              icon: Clock,
              label: "Watch Time",
              value: analytics ? formatWatchTime(analytics.totalWatchTime) : "—",
            },
            {
              icon: Trophy,
              label: "Matches",
              value: analytics?.totalMatches ?? 0,
            },
            {
              icon: Activity,
              label: "Engagement",
              value: analytics
                ? `${Math.round(analytics.engagementScore)}%`
                : "—",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-3 text-center"
            >
              <stat.icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-lg font-bold tabular-nums leading-none">
                {stat.value}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {stat.label}
              </span>
            </div>
          ))}
        </motion.div>

        {/* ─── 3. Your Activity ─── */}
        {analytics && analytics.totalWatchTime > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="space-y-4 rounded-2xl border border-border bg-card p-5"
          >
            <h2 className="text-sm font-semibold">Your Activity</h2>

            {/* Favorite Categories */}
            {topCategories.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Favorite Categories</p>
                <div className="flex flex-wrap gap-2">
                  {topCategories.map(([cat, seconds]) => (
                    <Badge
                      key={cat}
                      variant="outline"
                      className="gap-1 text-xs"
                    >
                      {cat.charAt(0) + cat.slice(1).toLowerCase()}
                      <span className="text-[10px] text-muted-foreground">
                        {formatWatchTime(seconds)}
                      </span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Recently Watched */}
            {analytics.recentActivity.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Recently Watched</p>
                <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
                  {analytics.recentActivity.slice(0, 8).map((act) => (
                    <div
                      key={act.id}
                      className="flex shrink-0 flex-col gap-1 rounded-lg border border-border bg-background/50 p-3 w-36"
                    >
                      <p className="truncate text-xs font-medium">
                        {act.title ?? "Untitled"}
                      </p>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        {act.category && (
                          <span className="truncate">{act.category}</span>
                        )}
                        {act.watchDuration > 0 && (
                          <span className="tabular-nums">
                            {Math.round(act.watchDuration / 60)}m
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Link
              href="/analytics"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              View full analytics
            </Link>
          </motion.div>
        )}

        {/* ─── 4. Passes ─── */}
        {passes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Match Passes</h2>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {activePasses.length} active
              </Badge>
            </div>

            <div className="space-y-2">
              {activePasses.map((pass) => (
                <PassCard key={pass.id} pass={pass} active />
              ))}
              {expiredPasses.slice(0, 3).map((pass) => (
                <PassCard key={pass.id} pass={pass} active={false} />
              ))}
            </div>

            {passes.length === 0 && (
              <div className="py-6 text-center text-muted-foreground text-sm">
                <p>No match passes yet.</p>
                <Button variant="outline" className="mt-3" size="sm" asChild>
                  <Link href="/sports">Browse Matches</Link>
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {/* ─── 5. Interests ─── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="rounded-2xl border border-border bg-card p-5"
        >
          <h2 className="text-sm font-semibold mb-3">Interests</h2>
          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => toggleInterest(opt)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  interests.includes(opt)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {interests.includes(opt) && (
                  <Check className="mr-1 inline h-3 w-3" />
                )}
                {opt}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ─── 6. Settings (Collapsible Accordion) ─── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="rounded-2xl border border-border bg-card px-5"
        >
          <Accordion type="single" collapsible>
            {/* Profile Info */}
            <AccordionItem value="profile-info">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Profile Info
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <div className="flex items-center gap-2">
                      <Input value={profile?.email ?? ""} disabled className="flex-1" />
                      {profile?.emailVerified && (
                        <Badge
                          variant="outline"
                          className="border-green-500/30 bg-green-500/10 text-green-400 shrink-0"
                        >
                          <ShieldCheck className="mr-1 h-3 w-3" />
                          Verified
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+263 7X XXX XXXX"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="dob">Date of Birth</Label>
                      <Input
                        id="dob"
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        max={new Date().toISOString().split("T")[0]}
                        className="[color-scheme:dark]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      <select
                        id="gender"
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30 [color-scheme:dark]"
                      >
                        <option value="">Select…</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Non-binary">Non-binary</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Personalization */}
            <AccordionItem value="personalization">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Languages className="h-4 w-4 text-muted-foreground" />
                  Personalization
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <select
                      id="language"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30 [color-scheme:dark]"
                    >
                      {LANGUAGE_OPTIONS.map((lang) => (
                        <option key={lang} value={lang}>
                          {lang}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Location */}
            <AccordionItem value="location" className="border-b-0">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Location
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Harare"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <select
                        id="country"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30 [color-scheme:dark]"
                      >
                        <option value="">Select…</option>
                        <option value="Zimbabwe">Zimbabwe</option>
                        <option value="South Africa">South Africa</option>
                        <option value="Zambia">Zambia</option>
                        <option value="Botswana">Botswana</option>
                        <option value="Mozambique">Mozambique</option>
                        <option value="Malawi">Malawi</option>
                        <option value="Tanzania">Tanzania</option>
                        <option value="Kenya">Kenya</option>
                        <option value="United Kingdom">United Kingdom</option>
                        <option value="United States">United States</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </motion.div>

        {/* Spacer for sticky save bar */}
        <div className="h-16" />
      </div>

      {/* ─── 7. Sticky Save Bar ─── */}
      <AnimatePresence>
        {isDirty && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed inset-x-0 bottom-0 z-40 md:bottom-0 bottom-[calc(5rem+env(safe-area-inset-bottom))]"
          >
            <div className="mx-auto max-w-3xl px-4">
              <div className="flex items-center justify-between rounded-t-xl border border-b-0 border-border bg-card/95 px-5 py-3 shadow-lg shadow-black/30 backdrop-blur-xl md:rounded-xl md:border-b md:mb-4">
                <span className="text-sm text-muted-foreground">
                  Unsaved changes
                </span>
                <div className="flex items-center gap-2">
                  {saved && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-1 text-sm text-green-500"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </motion.span>
                  )}
                  <Button
                    size="sm"
                    disabled={saving}
                    onClick={handleSave}
                    className="gradient-accent border-0 text-white"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="mr-1 h-4 w-4" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}

function PassCard({ pass, active }: { pass: Pass; active: boolean }) {
  const isUpcoming = pass.passState === "OWNED_UPCOMING";
  const passStartTime = pass.passStart
    ? new Date(pass.passStart).toLocaleTimeString("en-ZW", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div
      className={`flex items-center justify-between rounded-lg border p-3 ${
        active
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-background opacity-60"
      }`}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {pass.match.homeTeam} vs {pass.match.awayTeam}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {new Date(pass.match.kickoff).toLocaleDateString("en-ZW", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {active ? (
          isUpcoming ? (
            <>
              <Badge
                variant="outline"
                className="border-amber-500/30 bg-amber-500/10 text-amber-400 text-[10px]"
              >
                Starts at {passStartTime}
              </Badge>
              <Button size="sm" variant="outline" disabled>
                Watch
              </Button>
            </>
          ) : (
            <>
              <Badge
                variant="outline"
                className="border-green-500/30 bg-green-500/10 text-green-400"
              >
                Active
              </Badge>
              <Button size="sm" variant="outline" asChild>
                <Link href={`/watch/${pass.matchId}`}>Watch</Link>
              </Button>
            </>
          )
        ) : (
          <Badge variant="outline" className="text-muted-foreground text-[10px]">
            Expired
          </Badge>
        )}
      </div>
    </div>
  );
}
