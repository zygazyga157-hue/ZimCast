"use client";

import { useEffect, useState } from "react";
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
  BarChart3,
  Mail,
  ShieldCheck,
  Check,
  Clock,
  Trophy,
  Star,
  Lightbulb,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageTransition } from "@/components/page-transition";
import { Heatmap } from "@/components/analytics/heatmap";
import { StatsCard } from "@/components/analytics/stats-card";
import { CategoryChart } from "@/components/analytics/category-chart";
import { api, showApiError } from "@/lib/api";
import { toast } from "sonner";

const INTEREST_OPTIONS = [
  "Sports",
  "News",
  "Entertainment",
  "Music",
  "Documentary",
] as const;

const LANGUAGE_OPTIONS = ["English", "Shona", "Ndebele"] as const;

const TABS = [
  { id: "account", label: "Account", icon: User },
  { id: "passes", label: "Passes", icon: Ticket },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface Profile {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  city: string | null;
  country: string | null;
  emailVerified: boolean;
  interests: string[];
  language: string;
}

interface Pass {
  id: string;
  matchId: string;
  expiresAt: string;
  match: {
    homeTeam: string;
    awayTeam: string;
    kickoff: string;
    isLive: boolean;
  };
}

interface Analytics {
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
  const [activeTab, setActiveTab] = useState<TabId>("account");
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [language, setLanguage] = useState("English");

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login");
      return;
    }

    Promise.all([
      api<Profile>("/api/user/profile"),
      api<Pass[]>("/api/user/passes"),
    ])
      .then(([profileData, passesData]) => {
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
      })
      .catch((err) => showApiError(err, "Failed to load profile"))
      .finally(() => setLoading(false));
  }, [session, status, router]);

  useEffect(() => {
    if (searchParams.get("verified") === "true") {
      toast.success("Email verified successfully!");
      updateSession();
    }
  }, [searchParams, updateSession]);

  // Fetch analytics when switching to analytics tab
  useEffect(() => {
    if (activeTab !== "analytics" || analytics) return;
    setAnalyticsLoading(true);
    api<Analytics>("/api/user/analytics")
      .then(setAnalytics)
      .catch((err) => showApiError(err, "Failed to load analytics"))
      .finally(() => setAnalyticsLoading(false));
  }, [activeTab, analytics]);

  function toggleInterest(interest: string) {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
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

  return (
    <PageTransition>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Profile
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Manage your account, passes, and viewing insights.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              {activePasses.length} active pass{activePasses.length === 1 ? "" : "es"}
            </Badge>
            <Button variant="outline" size="sm" asChild>
              <Link href="/analytics">Analytics</Link>
            </Button>
          </div>
        </div>

        {/* Email verification banner */}
        {profile && !profile.emailVerified && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3"
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
            className="mt-4 flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3"
          >
            <ShieldCheck className="h-5 w-5 text-green-400" />
            <p className="text-sm text-green-300">
              Your email has been verified!
            </p>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="mt-6 flex gap-1 rounded-lg border border-border bg-card p-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-1 flex-col items-center justify-center gap-1 rounded-md px-2 py-2 text-[11px] font-medium transition-colors sm:flex-row sm:gap-2 sm:px-3 sm:text-sm ${
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground/80"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="profile-tab"
                    className="gradient-accent absolute inset-0 rounded-md opacity-15"
                    transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
                  />
                )}
                <Icon className="h-4 w-4" />
                <span className="relative">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {activeTab === "account" && (
            <motion.div
              key="account"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {/* Profile Form */}
              <div className="mt-6 rounded-xl border border-border bg-card p-6">
                <div className="flex items-center gap-3 mb-5">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold">Account Details</h2>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
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
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
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

                  <div className="space-y-2">
                    <Label>Interests</Label>
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
                  </div>

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

                  <div className="flex items-center gap-3 pt-2">
                    <Button
                      type="submit"
                      disabled={saving}
                      className="gradient-accent border-0 text-white"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Save className="mr-1 h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                    {saved && (
                      <motion.span
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-1 text-sm text-green-500"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Saved
                      </motion.span>
                    )}
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {activeTab === "passes" && (
            <motion.div
              key="passes"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mt-6 rounded-xl border border-border bg-card p-6">
                <div className="flex items-center gap-3 mb-5">
                  <Ticket className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold">Match Passes</h2>
                </div>

                {passes.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <p>No match passes yet.</p>
                    <Button variant="outline" className="mt-4" asChild>
                      <Link href="/sports">Browse Matches</Link>
                    </Button>
                  </div>
                ) : (
                  <>
                    {activePasses.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-medium text-muted-foreground">
                          Active
                        </h3>
                        {activePasses.map((pass) => (
                          <PassCard key={pass.id} pass={pass} active />
                        ))}
                      </div>
                    )}

                    {expiredPasses.length > 0 && (
                      <>
                        {activePasses.length > 0 && (
                          <Separator className="my-5" />
                        )}
                        <div className="space-y-3">
                          <h3 className="text-sm font-medium text-muted-foreground">
                            Expired
                          </h3>
                          {expiredPasses.map((pass) => (
                            <PassCard key={pass.id} pass={pass} active={false} />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "analytics" && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {analyticsLoading ? (
                <div className="mt-6 flex justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : analytics && analytics.totalWatchTime > 0 ? (
                <div className="mt-6 space-y-6">
                  {/* Stats cards */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatsCard
                      icon={Clock}
                      label="Watch Time"
                      value={analytics.totalWatchTime}
                      format="time"
                      delay={0}
                    />
                    <StatsCard
                      icon={Activity}
                      label="Engagement"
                      value={analytics.engagementScore}
                      format="percent"
                      delay={100}
                    />
                    <StatsCard
                      icon={Star}
                      label="Favorite"
                      value={analytics.favoriteCategory?.toLowerCase() ?? "—"}
                      delay={200}
                    />
                    <StatsCard
                      icon={Trophy}
                      label="Matches"
                      value={analytics.totalMatches}
                      format="number"
                      delay={300}
                    />
                  </div>

                  {/* Activity Heatmap */}
                  <div className="rounded-xl border border-border bg-card p-5">
                    <h3 className="mb-4 text-sm font-semibold flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      Activity Heatmap
                    </h3>
                    <Heatmap data={analytics.weeklyHeatmap} />
                  </div>

                  {/* Category breakdown + Insights */}
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="rounded-xl border border-border bg-card p-5">
                      <h3 className="mb-4 text-sm font-semibold">Category Breakdown</h3>
                      <CategoryChart data={analytics.categoryBreakdown} />
                    </div>

                    {analytics.insights.length > 0 && (
                      <div className="rounded-xl border border-border bg-card p-5">
                        <h3 className="mb-4 text-sm font-semibold flex items-center gap-2">
                          <Lightbulb className="h-4 w-4 text-amber-400" />
                          Insights
                        </h3>
                        <div className="space-y-3">
                          {analytics.insights.map((insight, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.1 + 0.4, duration: 0.3 }}
                              className="flex items-start gap-2 text-sm text-muted-foreground"
                            >
                              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                              {insight}
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Recent activity */}
                  {analytics.recentActivity.length > 0 && (
                    <div className="rounded-xl border border-border bg-card p-5">
                      <h3 className="mb-4 text-sm font-semibold">Recent Activity</h3>
                      <div className="space-y-3">
                        {analytics.recentActivity.map((act, i) => (
                          <motion.div
                            key={act.id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05, duration: 0.2 }}
                            className="flex items-center justify-between rounded-lg border border-border p-3"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {act.title ?? "—"}
                              </p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {new Date(act.createdAt).toLocaleDateString("en-ZW", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {act.category && (
                                <Badge variant="outline" className="text-[10px]">
                                  {act.category}
                                </Badge>
                              )}
                              {act.watchDuration > 0 && (
                                <span className="text-xs text-muted-foreground tabular-nums">
                                  {Math.round(act.watchDuration / 60)}min
                                </span>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-6 rounded-xl border border-border bg-card p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <BarChart3 className="h-5 w-5 text-muted-foreground" />
                    <h2 className="text-lg font-semibold">Viewing Analytics</h2>
                  </div>
                  <div className="py-12 text-center text-muted-foreground">
                    <BarChart3 className="mx-auto h-10 w-10 mb-3 opacity-40" />
                    <p>Your viewing analytics will appear here.</p>
                    <p className="mt-1 text-sm">
                      Start watching content to generate insights.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}

function PassCard({ pass, active }: { pass: Pass; active: boolean }) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg border p-4 ${
        active
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-background opacity-60"
      }`}
    >
      <div>
        <p className="font-medium">
          {pass.match.homeTeam} vs {pass.match.awayTeam}
        </p>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {new Date(pass.match.kickoff).toLocaleDateString("en-ZW", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {active ? (
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
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            Expired
          </Badge>
        )}
      </div>
    </div>
  );
}
