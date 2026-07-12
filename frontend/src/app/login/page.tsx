"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { Loader2, Lock, User, Mail } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IPL_TEAM_SHORT_NAMES } from "@/constants/teams";

export default function LoginPage() {
  const {
    isAuthenticated,
    isInitialized,
    loading: authLoading,
    error: authError,
    login,
    register,
  } = useAuthStore();

  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [favoriteTeam, setFavoriteTeam] = useState("Chennai Super Kings");

  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isInitialized, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    if (isLogin) {
      await login(email, password);
    } else {
      await register(email, password, favoriteTeam);
    }
  };

  if (!isInitialized) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[75vh] items-center justify-center py-12">
      <Card className="w-full max-w-md border-emerald-500/20 bg-card/90 shadow-2xl backdrop-blur-sm">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-lg font-bold text-white shadow-lg shadow-emerald-500/20 animate-pulse">
            IPL
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            {isLogin ? "Welcome Back" : "Create Account"}
          </CardTitle>
          <CardDescription>
            {isLogin
              ? "Sign in to access your IPL Playoff Predictor dashboard"
              : "Create a new profile to track simulations and save predictions"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {authError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                {authError}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted/20 py-2 pl-10 pr-4 text-sm outline-none transition-colors focus:border-emerald-500/50 focus:bg-background text-foreground"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted/20 py-2 pl-10 pr-4 text-sm outline-none transition-colors focus:border-emerald-500/50 focus:bg-background text-foreground"
                />
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Favorite Team/Franchise
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <select
                    value={favoriteTeam}
                    onChange={(e) => setFavoriteTeam(e.target.value)}
                    className="w-full rounded-lg border border-border bg-muted/20 py-2 pl-10 pr-4 text-sm outline-none transition-colors focus:border-emerald-500/50 focus:bg-background appearance-none text-foreground"
                  >
                    {Object.keys(IPL_TEAM_SHORT_NAMES).map((team) => (
                      <option key={team} value={team} className="bg-background text-foreground">
                        {team}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={authLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-lg shadow-emerald-500/10"
            >
              {authLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : isLogin ? (
                "Sign In"
              ) : (
                "Register Account"
              )}
            </Button>

            <div className="pt-2 text-center text-xs">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setPassword("");
                }}
                className="text-emerald-400 hover:underline underline-offset-4"
              >
                {isLogin
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Sign in"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
