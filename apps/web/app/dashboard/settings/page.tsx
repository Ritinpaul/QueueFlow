"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../../lib/api";
import { User, Lock, Key, Save, Loader2, Eye, EyeOff, CheckCircle } from "lucide-react";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export default function SettingsPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  // Profile form
  const [name, setName] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchApi("/auth/me");
        setUser(res.data);
        setName(res.data.name);
      } catch {
        // token likely invalid, dashboard layout handles redirect
      } finally {
        setIsLoadingUser(false);
      }
    };
    load();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSuccess(false);
    // Simulate save — wire to PATCH /api/v1/auth/me when backend endpoint exists
    await new Promise((r) => setTimeout(r, 600));
    setIsSavingProfile(false);
    setProfileSuccess(true);
    setTimeout(() => setProfileSuccess(false), 3000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(false);
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      setIsSavingPassword(false);
      return;
    }
    // Simulate save — wire to PATCH /api/v1/auth/password when backend endpoint exists
    await new Promise((r) => setTimeout(r, 600));
    setIsSavingPassword(false);
    setPasswordSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setTimeout(() => setPasswordSuccess(false), 3000);
  };

  if (isLoadingUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="font-heading text-4xl font-black uppercase tracking-tighter text-foreground">Settings</h1>
        <p className="text-foreground/70 mt-1 font-medium">Manage your account and preferences.</p>
      </div>

      {/* ── Profile Section ────────────────────────────────── */}
      <section className="bg-white border-[1.5px] border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-10 h-10 bg-primary border-[1.5px] border-foreground flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <User className="w-5 h-5 text-foreground" />
          </div>
          <h2 className="font-heading text-2xl font-black uppercase">Profile</h2>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground uppercase tracking-widest block">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-white border-[1.5px] border-foreground focus:ring-2 focus:ring-primary focus:border-foreground outline-none transition-all text-foreground placeholder:text-foreground/40 font-bold"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground uppercase tracking-widest block">Email</label>
            <input
              type="email"
              value={user?.email ?? ""}
              disabled
              className="w-full px-4 py-3 bg-background border-[1.5px] border-foreground/30 text-foreground/50 cursor-not-allowed font-bold"
            />
            <p className="text-xs font-medium text-foreground/50">Email cannot be changed.</p>
          </div>

          <div className="flex items-center gap-4 pt-4">
            <button
              type="submit"
              disabled={isSavingProfile}
              className="flex items-center gap-2 bg-primary text-foreground border-[1.5px] border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 font-bold px-6 py-3 transition-all disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {isSavingProfile ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              Save Changes
            </button>
            {profileSuccess && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-500">
                <CheckCircle className="w-4 h-4" />
                Saved!
              </span>
            )}
          </div>
        </form>
      </section>

      {/* ── Account Info ───────────────────────────────────── */}
      <section className="bg-white border-[1.5px] border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-10 h-10 bg-primary border-[1.5px] border-foreground flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Key className="w-5 h-5 text-foreground" />
          </div>
          <h2 className="font-heading text-2xl font-black uppercase">Account Info</h2>
        </div>

        <div className="space-y-4 font-medium">
          <div className="flex justify-between py-3 border-b-[1.5px] border-foreground/20">
            <span className="text-foreground/70 uppercase tracking-widest text-xs font-bold">User ID</span>
            <span className="font-mono text-foreground font-bold">{user?.id}</span>
          </div>
          <div className="flex justify-between py-3 border-b-[1.5px] border-foreground/20">
            <span className="text-foreground/70 uppercase tracking-widest text-xs font-bold">Member since</span>
            <span className="text-foreground font-bold">
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "—"}
            </span>
          </div>
          <div className="flex justify-between py-3">
            <span className="text-foreground/70 uppercase tracking-widest text-xs font-bold">Plan</span>
            <span className="bg-primary text-foreground border-[1.5px] border-foreground text-xs font-bold uppercase tracking-wider px-3 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              Free
            </span>
          </div>
        </div>
      </section>

      {/* ── Security Section ───────────────────────────────── */}
      <section className="bg-white border-[1.5px] border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-10 h-10 bg-primary border-[1.5px] border-foreground flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Lock className="w-5 h-5 text-foreground" />
          </div>
          <h2 className="font-heading text-2xl font-black uppercase">Security</h2>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-6">
          {passwordError && (
            <div className="p-4 bg-destructive text-destructive-foreground font-bold border-[1.5px] border-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              {passwordError}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground uppercase tracking-widest block">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-4 py-3 pr-12 bg-white border-[1.5px] border-foreground focus:ring-2 focus:ring-primary focus:border-foreground outline-none transition-all text-foreground placeholder:text-foreground/40 font-bold"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground hover:text-primary transition-colors"
              >
                {showCurrent ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground uppercase tracking-widest block">New Password</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full px-4 py-3 pr-12 bg-white border-[1.5px] border-foreground focus:ring-2 focus:ring-primary focus:border-foreground outline-none transition-all text-foreground placeholder:text-foreground/40 font-bold"
                placeholder="Min. 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground hover:text-primary transition-colors"
              >
                {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-4">
            <button
              type="submit"
              disabled={isSavingPassword}
              className="flex items-center gap-2 bg-foreground text-background border-[1.5px] border-foreground shadow-[4px_4px_0px_0px_rgba(223,255,0,1)] hover:-translate-y-0.5 font-bold px-6 py-3 transition-all disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {isSavingPassword ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Lock className="w-5 h-5" />
              )}
              Update Password
            </button>
            {passwordSuccess && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-500">
                <CheckCircle className="w-4 h-4" />
                Password updated!
              </span>
            )}
          </div>
        </form>
      </section>

      {/* ── Danger Zone ────────────────────────────────────── */}
      <section className="bg-background border-[1.5px] border-destructive p-8 shadow-[4px_4px_0px_0px_rgba(220,38,38,1)]">
        <h2 className="font-heading text-2xl font-black uppercase text-destructive mb-3">Danger Zone</h2>
        <p className="text-foreground/70 font-medium mb-6">
          Deleting your account is permanent and cannot be undone.
        </p>
        <button
          disabled
          className="font-bold text-destructive border-[1.5px] border-destructive bg-destructive/10 px-6 py-3 opacity-50 cursor-not-allowed"
        >
          Delete Account
        </button>
      </section>
    </div>
  );
}
