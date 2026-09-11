"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

const variants = {
  primary:
    "bg-gradient-to-b from-[#5a6b7c] to-brand text-white shadow-md shadow-navy/20 hover:from-brand hover:to-brand-hover disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none",
  secondary:
    "bg-white/90 text-stone-800 border border-stone-200 shadow-sm hover:bg-white hover:border-stone-300 disabled:opacity-50",
  danger: "bg-stone-700 text-white hover:bg-stone-800 disabled:bg-stone-300",
  ghost: "text-stone-700 hover:bg-white/70 disabled:opacity-50",
  success:
    "bg-gradient-to-b from-menu to-menu-hover text-white shadow-md shadow-menu/25 hover:from-menu-hover hover:to-menu-hover disabled:from-slate-300 disabled:to-slate-300",
};

const sizes = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-all duration-200 ease-out hover:-translate-y-px active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:translate-y-0",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
