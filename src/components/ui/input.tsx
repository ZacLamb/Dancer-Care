"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "w-full h-11 rounded-2xl border border-brand-input-border bg-white px-4 text-sm text-brand-dark placeholder:text-[#9A9A8A] focus:outline-none focus:ring-2 focus:ring-brand-lime",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full rounded-2xl border border-brand-input-border bg-white px-4 py-3 text-sm text-brand-dark placeholder:text-[#9A9A8A] focus:outline-none focus:ring-2 focus:ring-brand-lime",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "w-full h-11 rounded-2xl border border-brand-input-border bg-white px-4 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-lime",
      className
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("block text-sm font-medium text-brand-dark mb-1.5", className)}
      {...props}
    />
  );
}
