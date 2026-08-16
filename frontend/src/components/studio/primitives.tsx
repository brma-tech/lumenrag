import React from "react";

export const cn = (...classes: Array<string | undefined | null | false>) =>
  classes.filter(Boolean).join(" ");

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "border-teal-300/50 bg-teal-300 text-slate-950 shadow-[0_14px_34px_rgba(45,212,191,0.16)] hover:border-teal-200 hover:bg-teal-200 focus-visible:ring-teal-200/40",
  secondary:
    "border-slate-700 bg-slate-900/80 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-slate-500 hover:bg-slate-800 focus-visible:ring-slate-400/30",
  ghost:
    "border-transparent bg-transparent text-slate-400 hover:border-slate-700 hover:bg-slate-900/70 hover:text-slate-100 focus-visible:ring-teal-300/25",
  danger:
    "border-rose-400/40 bg-rose-500/15 text-rose-100 shadow-[0_14px_34px_rgba(244,63,94,0.10)] hover:border-rose-300/60 hover:bg-rose-500/25 focus-visible:ring-rose-300/30",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45",
        buttonVariants[variant],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";

export interface IconButtonProps extends ButtonProps {
  "aria-label": string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = "secondary", ...props }, ref) => (
    <Button
      ref={ref}
      variant={variant}
      className={cn("h-10 w-10 shrink-0 rounded-lg p-0", className)}
      {...props}
    />
  )
);
IconButton.displayName = "IconButton";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-slate-800 bg-slate-900/82 p-5 text-slate-100 shadow-[0_20px_64px_rgba(2,6,23,0.32),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

type CalloutTone = "info" | "success" | "error";

const calloutTones: Record<CalloutTone, string> = {
  info: "border-teal-300/25 bg-teal-300/[0.08] text-teal-50 shadow-[inset_0_1px_0_rgba(45,212,191,0.1)]",
  success:
    "border-emerald-300/25 bg-emerald-300/[0.08] text-emerald-50 shadow-[inset_0_1px_0_rgba(110,231,183,0.1)]",
  error:
    "border-rose-300/30 bg-rose-400/[0.1] text-rose-50 shadow-[inset_0_1px_0_rgba(253,164,175,0.12)]",
};

export interface CalloutProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: CalloutTone;
}

export const Callout = React.forwardRef<HTMLDivElement, CalloutProps>(
  ({ className, tone = "info", ...props }, ref) => (
    <div
      ref={ref}
      role="status"
      className={cn(
        "rounded-lg border px-4 py-3 text-sm leading-6 backdrop-blur-md",
        calloutTones[tone],
        className
      )}
      {...props}
    />
  )
);
Callout.displayName = "Callout";

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {}

export const Chip = React.forwardRef<HTMLSpanElement, ChipProps>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-xs font-medium text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
        className
      )}
      {...props}
    />
  )
);
Chip.displayName = "Chip";

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
}

export const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  ({ className, label, hint, error, children, ...props }, ref) => (
    <div ref={ref} className={cn("block space-y-2", className)} {...props}>
      {(label || hint) && (
        <div className="flex items-end justify-between gap-3">
          {label && (
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              {label}
            </div>
          )}
          {hint && <div className="text-xs text-slate-500">{hint}</div>}
        </div>
      )}
      {children}
      {error && <div className="text-xs text-rose-300">{error}</div>}
    </div>
  )
);
Field.displayName = "Field";

export interface SectionHeadingProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}

export const SectionHeading = React.forwardRef<HTMLDivElement, SectionHeadingProps>(
  ({ className, eyebrow, title, description, actions, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
      {...props}
    >
      <div className="min-w-0 space-y-2">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-300/80">
            {eyebrow}
          </p>
        )}
        <h2 className="text-2xl font-semibold text-slate-50 md:text-3xl">
          {title}
        </h2>
        {description && (
          <p className="max-w-2xl text-sm leading-6 text-slate-400">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
);
SectionHeading.displayName = "SectionHeading";
