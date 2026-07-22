"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-brand-dark">
          {title}
        </h1>
        {subtitle && <p className="text-brand-muted mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const statColors: Record<string, string> = {
  info: "bg-brand-info",
  warning: "bg-brand-warning",
  success: "bg-brand-success",
  error: "bg-brand-error",
  lime: "bg-brand-lime text-brand-dark",
};

export function StatCard({
  label,
  value,
  icon,
  color = "info",
}: {
  label: string;
  value: number | string;
  icon: ReactNode;
  color?: keyof typeof statColors;
}) {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-brand-border p-5 space-y-3">
      <div
        className={`inline-flex p-2 rounded-xl text-white ${statColors[color]}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-brand-dark">{value}</p>
        <p className="text-sm text-brand-muted">{label}</p>
      </div>
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-brand-muted" />
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16 text-brand-muted">
      <p>{message}</p>
    </div>
  );
}

export function LabelBadge({ label }: { label: string }) {
  const colors: Record<string, string> = {
    COVERAGE: "bg-brand-info/15 text-brand-info",
    REMINDER: "bg-brand-warning/15 text-brand-warning",
    ANNOUNCEMENT: "bg-brand-lime/30 text-brand-dark",
    UPDATE: "bg-brand-success/15 text-brand-success",
    GENERAL: "bg-brand-yellow text-brand-dark",
  };
  return (
    <span
      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
        colors[label] ?? colors.GENERAL
      }`}
    >
      {label}
    </span>
  );
}
