"use client";

import { create } from "zustand";
import { api } from "@/services/api";

export interface UserProfile {
  id: string;
  email: string;
  lastLogin?: string;
  totalSimulationsCount: number;
  savedSimulationsCount: number;
  favoriteTeam?: string;
}

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  isInitialized: boolean;

  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, favoriteTeam: string) => Promise<boolean>;
  logout: () => void;
  initialize: () => Promise<void>;
  updateUserStats: (totalSims?: number, savedSims?: number) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  isInitialized: false,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await api.login({ email, password });
      const { token, user } = res.data;
      if (typeof window !== "undefined") {
        localStorage.setItem("ipl_predictor_token", token);
      }
      set({
        token,
        user,
        isAuthenticated: true,
        loading: false,
      });
      return true;
    } catch (e: any) {
      set({
        loading: false,
        error: e?.response?.data?.message || "Invalid email or password",
      });
      return false;
    }
  },

  register: async (email, password, favoriteTeam) => {
    set({ loading: true, error: null });
    try {
      const res = await api.register({ email, password, favoriteTeam });
      const { token, user } = res.data;
      if (typeof window !== "undefined") {
        localStorage.setItem("ipl_predictor_token", token);
      }
      set({
        token,
        user,
        isAuthenticated: true,
        loading: false,
      });
      return true;
    } catch (e: any) {
      set({
        loading: false,
        error: e?.response?.data?.message || "Registration failed. Email might be in use.",
      });
      return false;
    }
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("ipl_predictor_token");
    }
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },

  initialize: async () => {
    if (get().isInitialized) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("ipl_predictor_token") : null;
    if (!token) {
      set({ isInitialized: true });
      return;
    }

    set({ token, loading: true });
    try {
      const res = await api.getMe();
      set({
        user: res.data,
        isAuthenticated: true,
        loading: false,
        isInitialized: true,
      });
    } catch (e) {
      // Token invalid or expired
      if (typeof window !== "undefined") {
        localStorage.removeItem("ipl_predictor_token");
      }
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        loading: false,
        isInitialized: true,
      });
    }
  },

  updateUserStats: async (totalSims, savedSims) => {
    const { user, isAuthenticated } = get();
    if (!isAuthenticated || !user) return;

    try {
      const updatedTotal = totalSims !== undefined ? totalSims : user.totalSimulationsCount;
      const updatedSaved = savedSims !== undefined ? savedSims : user.savedSimulationsCount;

      const res = await api.updateStats({
        totalSimulationsCount: updatedTotal,
        savedSimulationsCount: updatedSaved,
      });

      set({ user: res.data });
    } catch (e) {
      console.error("Failed to sync stats to database", e);
    }
  },
}));
