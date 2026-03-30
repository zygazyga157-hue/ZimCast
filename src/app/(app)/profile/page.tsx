"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Loader2,
  User,
  Ticket,
  Calendar,
  Save,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageTransition } from "@/components/page-transition";

interface Profile {
  id: string;
  email: string;
  name: string | null;
  age: number | null;
  gender: string | null;
  city: string | null;
  country: string | null;
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

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [passes, setPasses] = useState<Pass[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login");
      return;
    }

    Promise.all([
      fetch("/api/user/profile").then((r) => r.json()),
      fetch("/api/user/passes").then((r) => r.json()),
    ])
      .then(([profileData, passesData]) => {
        setProfile(profileData);
        setName(profileData.name ?? "");
        setAge(profileData.age?.toString() ?? "");
        setGender(profileData.gender ?? "");
        setCity(profileData.city ?? "");
        setCountry(profileData.country ?? "");
        setPasses(passesData.passes ?? passesData ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session, status, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    try {
      await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || undefined,
          age: age ? parseInt(age, 10) : undefined,
          gender: gender || undefined,
          city: city || undefined,
          country: country || undefined,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // silent fail
    } finally {
      setSaving(false);
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
        <h1 className="text-2xl font-bold sm:text-3xl">Profile</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your account and view your match passes.
        </p>

        {/* Profile Form */}
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <User className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Account Details</h2>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={profile?.email ?? ""} disabled />
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
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="25"
                  min={1}
                  max={150}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Input
                  id="gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  placeholder="e.g. Male"
                />
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
                <Input
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Zimbabwe"
                />
              </div>
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

        {/* Match Passes */}
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
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
