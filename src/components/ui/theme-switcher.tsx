import React from "react";
import { cn } from "@/lib/utils";

type Theme = "daylight" | "dusk" | "midnight";

const THEMES: { value: Theme; label: string }[] = [
  { value: "daylight", label: "Light" },
  { value: "dusk", label: "Dusk" },
  { value: "midnight", label: "Dark" },
];

function getTheme(): Theme {
  const stored = localStorage.getItem("polaris-theme");
  if (stored && ["daylight", "dusk", "midnight"].includes(stored)) {
    return stored as Theme;
  }
  return (document.documentElement.getAttribute("data-theme") as Theme) || "dusk";
}

function setTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("polaris-theme", theme);
}

export function ThemeSwitcher({ className }: { className?: string }) {
  const [current, setCurrent] = React.useState<Theme>(getTheme);

  const handleChange = (theme: Theme) => {
    setTheme(theme);
    setCurrent(theme);
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-border bg-muted p-0.5",
        className,
      )}
    >
      {THEMES.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => handleChange(value)}
          className={cn(
            "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
            current === value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-accent",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
