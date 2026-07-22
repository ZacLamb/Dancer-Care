"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "PATIENT",
    agencyName: "",
    inviteCode: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Registration failed");
      router.push(data.redirect || "/");
    } catch (err) {
      toast((err as Error).message, "error");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-cream p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-brand-border p-8 space-y-6">
        <div className="text-center">
          <Link href="/" className="text-2xl font-bold text-brand-dark">
            CareConnect
          </Link>
          <p className="text-brand-muted mt-2">Create your account</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>I am a...</Label>
            <Select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="PATIENT">Patient / Family</option>
              <option value="PROVIDER">Care Provider</option>
              <option value="AGENCY">Agency</option>
            </Select>
          </div>
          <div>
            <Label>Full name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          {form.role === "AGENCY" && (
            <div>
              <Label>Agency name</Label>
              <Input
                value={form.agencyName}
                onChange={(e) =>
                  setForm({ ...form, agencyName: e.target.value })
                }
                required
              />
            </div>
          )}
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <Label>Password</Label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              autoComplete="new-password"
              placeholder="At least 8 characters"
            />
          </div>
          {form.role !== "AGENCY" && (
            <div>
              <Label>Invite code (optional)</Label>
              <Input
                value={form.inviteCode}
                onChange={(e) =>
                  setForm({ ...form, inviteCode: e.target.value })
                }
                placeholder="Join a care team"
              />
            </div>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Creating..." : "Create Account"}
          </Button>
        </form>
        <p className="text-center text-sm text-brand-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-brand-dark font-semibold underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
