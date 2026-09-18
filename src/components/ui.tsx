"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  INQUIRY_STATUS_LABEL,
  QUOTE_STATUS_LABEL,
  type InquiryStatus,
  type QuoteStatus,
} from "@/lib/types";

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
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink-200 pb-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900 md:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-ink-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Card({
  children,
  className = "",
  as = "div",
  testId,
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section";
  testId?: string;
}) {
  const Tag = as;
  return (
    <Tag
      data-testid={testId}
      className={`rounded-xl border border-ink-200 bg-white shadow-[0_1px_2px_rgba(21,26,33,0.04)] ${className}`}
    >
      {children}
    </Tag>
  );
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">{children}</h2>
      {hint ? <span className="text-xs text-ink-400">{hint}</span> : null}
    </div>
  );
}

type ButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "md" | "lg" | "sm";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  title?: string;
};

const VARIANTS: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-700",
  secondary: "bg-ink-900 text-white hover:bg-ink-800",
  ghost: "bg-white text-ink-700 border border-ink-200 hover:bg-ink-50",
  danger: "bg-white text-red-700 border border-red-200 hover:bg-red-50",
};

const SIZES: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-5 py-3 text-base",
};

export function Button({
  children,
  onClick,
  href,
  variant = "primary",
  size = "md",
  type = "button",
  disabled,
  className = "",
  title,
}: ButtonProps) {
  const classes = `inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
  if (href) {
    return (
      <Link href={href} className={classes} title={title}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes} title={title}>
      {children}
    </button>
  );
}

const QUOTE_TONES: Record<QuoteStatus, string> = {
  entwurf: "bg-ink-100 text-ink-600",
  bereit: "bg-blue-50 text-blue-700",
  gesendet: "bg-amber-50 text-amber-800",
  angenommen: "bg-emerald-50 text-emerald-700",
  abgelehnt: "bg-red-50 text-red-700",
  abgelaufen: "bg-ink-200 text-ink-700",
};

const INQUIRY_TONES: Record<InquiryStatus, string> = {
  neu: "bg-brand-50 text-brand-700",
  rueckfrage: "bg-amber-50 text-amber-800",
  besichtigung: "bg-blue-50 text-blue-700",
  bereit: "bg-emerald-50 text-emerald-700",
  angebot_erstellt: "bg-ink-100 text-ink-600",
  abgeschlossen: "bg-ink-100 text-ink-500",
};

export function QuoteBadge({ status }: { status: QuoteStatus }) {
  return (
    <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${QUOTE_TONES[status]}`}>
      {QUOTE_STATUS_LABEL[status]}
    </span>
  );
}

export function InquiryBadge({ status }: { status: InquiryStatus }) {
  return (
    <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${INQUIRY_TONES[status]}`}>
      {INQUIRY_STATUS_LABEL[status]}
    </span>
  );
}

export function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-ink-300 bg-white px-6 py-10 text-center">
      <p className="text-base font-semibold text-ink-800">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">{text}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
  required,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink-700">
        {label}
        {required ? <span className="text-brand-600"> *</span> : null}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-ink-400">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-ink-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export function Fade({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

export function StatTile({
  label,
  value,
  href,
  tone = "neutral",
}: {
  label: string;
  value: number;
  href: string;
  tone?: "neutral" | "warn" | "good";
}) {
  const tones = {
    neutral: "text-ink-900",
    warn: value > 0 ? "text-brand-600" : "text-ink-300",
    good: "text-emerald-600",
  };
  return (
    <Link
      href={href}
      className="rounded-xl border border-ink-200 bg-white px-4 py-4 transition hover:border-ink-300 hover:shadow-sm"
    >
      <div className={`text-3xl font-bold tabular-nums ${tones[tone]}`}>{value}</div>
      <div className="mt-1 text-sm font-medium text-ink-500">{label}</div>
    </Link>
  );
}
