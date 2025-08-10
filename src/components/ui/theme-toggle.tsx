"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  variant?: "dropdown" | "toggle";
}

export function ThemeToggle({ className, variant = "dropdown" }: ThemeToggleProps) {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn("min-h-[44px] min-w-[44px] md:min-h-[40px] md:min-w-[40px]", className)}
        disabled
      >
        <Sun className="h-5 w-5" />
      </Button>
    );
  }

  const currentTheme = theme === "system" ? systemTheme : theme;

  const handleThemeChange = (newTheme: string) => {
    // Add transitioning class to prevent flash
    document.documentElement.classList.add("theme-transitioning");

    setTheme(newTheme);

    // Remove transitioning class after a short delay
    setTimeout(() => {
      document.documentElement.classList.remove("theme-transitioning");
    }, 50);
  };

  if (variant === "toggle") {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleThemeChange(currentTheme === "dark" ? "light" : "dark")}
        className={cn(
          "min-h-[44px] min-w-[44px] touch-manipulation transition-transform duration-200 active:scale-95 md:min-h-[40px] md:min-w-[40px]",
          className
        )}
        aria-label={`Switch to ${currentTheme === "dark" ? "light" : "dark"} mode`}
      >
        {currentTheme === "dark" ? (
          <Sun className="h-5 w-5 transition-all" />
        ) : (
          <Moon className="h-5 w-5 transition-all" />
        )}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "min-h-[44px] min-w-[44px] touch-manipulation transition-transform duration-200 active:scale-95 md:min-h-[40px] md:min-w-[40px]",
            className
          )}
          aria-label="Theme options"
        >
          {currentTheme === "dark" ? (
            <Moon className="h-5 w-5 transition-all" />
          ) : (
            <Sun className="h-5 w-5 transition-all" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[150px]">
        <DropdownMenuItem
          onClick={() => handleThemeChange("light")}
          className="min-h-[44px] cursor-pointer touch-manipulation md:min-h-[36px]"
        >
          <Sun className="mr-2 h-4 w-4" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleThemeChange("dark")}
          className="min-h-[44px] cursor-pointer touch-manipulation md:min-h-[36px]"
        >
          <Moon className="mr-2 h-4 w-4" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleThemeChange("system")}
          className="min-h-[44px] cursor-pointer touch-manipulation md:min-h-[36px]"
        >
          <Monitor className="mr-2 h-4 w-4" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
