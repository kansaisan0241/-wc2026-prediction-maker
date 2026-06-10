import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "outline" | "ghost" | "gold";
  size?: "default" | "sm" | "icon";
};

export function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        variant === "default" && "bg-primary text-primary-foreground shadow-sm hover:bg-primary/92",
        variant === "secondary" && "bg-secondary text-secondary-foreground hover:bg-secondary/85",
        variant === "outline" && "border border-border bg-background text-foreground hover:bg-muted",
        variant === "ghost" && "text-foreground hover:bg-muted",
        variant === "gold" && "bg-gold text-slate-950 shadow-sm hover:bg-gold/90",
        size === "default" && "h-11 px-4",
        size === "sm" && "h-9 px-3 text-xs",
        size === "icon" && "h-10 w-10",
        className
      )}
      {...props}
    />
  );
}
