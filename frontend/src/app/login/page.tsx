"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/services/api";
import { IPL_TEAM_SHORT_NAMES } from "@/constants/teams";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function getErrorMessage(err: unknown): string {
  if (typeof err === "string") return err;

  const maybeResponse = (err as { response?: { data?: { message?: unknown } } })
    ?.response;
  const msg = maybeResponse?.data?.message;

  if (typeof msg === "string") return msg;
  return "Something went wrong";
}


export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const teamOptions = useMemo(() => Object.keys(IPL_TEAM_SHORT_NAMES), []);

  const canSubmit = email.trim().length > 3 && password.length > 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (!password) {
      setError("Password is required");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.loginUser({ email, password });

      // Milestone 2: store JWT (no route protection yet, but foundation required)
      if (data?.token) {
        localStorage.setItem("ipl_auth_token", data.token);
      }

      setSuccess(data?.message ?? "Login successful");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card className="border-border/60 bg-background/70 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>Welcome back to IPL Playoff Predictor.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                {success}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={!canSubmit || loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              New here?{" "}
              <Link className="text-emerald-400 underline underline-offset-4" href="/register">
                Create an account
              </Link>
            </div>

            {/* keep favourite teams for analytics-theme continuity (no functional UI on login) */}
            <div className="hidden" aria-hidden>
              {teamOptions.length}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

