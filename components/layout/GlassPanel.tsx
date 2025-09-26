import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const toneStyles = {
  primary: {
    icon: "bg-[rgba(var(--color-primary),0.12)] border border-[rgba(var(--color-primary),0.25)] text-[rgb(var(--color-primary))]",
    title: "bg-gradient-to-r from-[rgb(var(--color-primary))] to-[rgb(var(--color-accent-2))]",
    header: "",
  },
  secondary: {
    icon: "bg-[rgba(var(--color-secondary),0.12)] border border-[rgba(var(--color-secondary),0.25)] text-[rgb(var(--color-secondary))]",
    title: "bg-gradient-to-r from-[rgb(var(--color-secondary))] to-[rgb(var(--color-accent-2))]",
    header: "",
  },
  tertiary: {
    icon: "bg-[rgba(var(--color-tertiary),0.12)] border border-[rgba(var(--color-tertiary),0.25)] text-[rgb(var(--color-tertiary))]",
    title: "bg-gradient-to-r from-[rgb(var(--color-tertiary))] to-[rgb(var(--color-accent-1))]",
    header: "",
  },
  neutral: {
    icon: "bg-[rgba(var(--color-border),0.15)] border border-[rgba(var(--color-border),0.3)] text-[rgb(var(--color-text-secondary))]",
    title: "bg-gradient-to-r from-[rgb(var(--color-text-secondary))] to-[rgb(var(--color-text-primary))]",
    header: "",
  },
} as const;

type Tone = keyof typeof toneStyles;

interface GlassPanelProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
  tone?: Tone;
}

export function GlassPanel({
  title,
  description,
  icon,
  actions,
  footer,
  children,
  className,
  contentClassName,
  headerClassName,
  tone = "primary",
}: GlassPanelProps) {
  const toneClass = toneStyles[tone] ?? toneStyles.primary;

  return (
    <Card className={cn("glass animate-fade-in", className)}>
      {(title || description || icon || actions) && (
        <div
          className={cn(
            "glass-header px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
            headerClassName,
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            {icon ? (
              <div className={cn("p-2 rounded-lg shrink-0", toneClass.icon)}>{icon}</div>
            ) : null}
            <div className="min-w-0">
              {title ? (
                <h2
                  className={cn(
                    "text-base font-semibold text-transparent bg-clip-text",
                    toneClass.title,
                  )}
                >
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p className="text-xs text-[rgb(var(--color-text-muted))] opacity-80 truncate">
                  {description}
                </p>
              ) : null}
            </div>
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      )}

      <CardContent className={cn("p-6 space-y-4", contentClassName)}>
        {children}
      </CardContent>

      {footer ? (
        <div className="px-6 py-4 border-t border-[rgba(var(--color-border),0.2)] bg-[rgba(var(--color-bg-secondary),0.35)]">
          {footer}
        </div>
      ) : null}
    </Card>
  );
}

export default GlassPanel;
