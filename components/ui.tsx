"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant =
  | "primary"
  | "success"
  | "amber"
  | "neutral"
  | "ghost"
  | "danger";
type Size = "sm" | "md" | "lg" | "xl";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-900/40",
  success:
    "bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-900/40",
  amber:
    "bg-amber-500 hover:bg-amber-400 text-slate-900 shadow-lg shadow-amber-900/40",
  neutral: "bg-slate-700 hover:bg-slate-600 text-white",
  ghost:
    "bg-transparent hover:bg-white/10 text-slate-200 border border-white/15",
  danger: "bg-transparent hover:bg-rose-500/20 text-rose-300 border border-rose-500/40",
};

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-base rounded-lg",
  md: "px-5 py-2.5 text-xl rounded-xl",
  lg: "px-7 py-3.5 text-2xl rounded-2xl",
  xl: "px-10 py-5 text-4xl rounded-3xl",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`font-semibold tracking-tight transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
