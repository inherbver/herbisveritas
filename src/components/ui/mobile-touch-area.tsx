"use client";

import React from "react";
import { cn } from "@/utils/cn";

interface MobileTouchAreaProps {
  /** The component to wrap with touch-optimized area */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Whether to apply mobile-only touch styles (default: true) */
  mobileOnly?: boolean;
  /** Touch feedback intensity */
  intensity?: "light" | "medium" | "strong";
  /** Disabled state */
  disabled?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** ARIA label for accessibility */
  "aria-label"?: string;
  /** Role for accessibility */
  role?: string;
}

/**
 * Mobile Touch Area Component
 *
 * Provides consistent touch targets with a minimum 44px touch area
 * and visual feedback optimized for mobile interaction.
 *
 * Features:
 * - Minimum 44px touch target for mobile accessibility
 * - Visual feedback on touch with configurable intensity
 * - Mobile-first responsive design
 * - Accessibility support with ARIA attributes
 *
 * @example
 * ```tsx
 * <MobileTouchArea intensity="medium" aria-label="Add to cart">
 *   <Button>Add to Cart</Button>
 * </MobileTouchArea>
 * ```
 */
export function MobileTouchArea({
  children,
  className,
  mobileOnly = true,
  intensity = "medium",
  disabled = false,
  onClick,
  "aria-label": ariaLabel,
  role,
}: MobileTouchAreaProps) {
  const touchFeedbackClasses = {
    light: "active:scale-[0.98]",
    medium: "active:scale-95",
    strong: "active:scale-90",
  };

  const baseClasses = cn(
    // Minimum touch target size
    "min-h-[44px] min-w-[44px]",
    // Touch optimizations
    "touch-manipulation select-none",
    // Transition for smooth feedback
    "transition-transform duration-200 ease-out",
    // Touch feedback
    !disabled && touchFeedbackClasses[intensity],
    // Mobile-only styles if specified
    mobileOnly && "md:min-h-[36px] md:min-w-[36px]",
    // Disabled state
    disabled && "pointer-events-none opacity-50",
    // Focus styles for accessibility
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    className
  );

  const Component = onClick || role ? "button" : "div";

  return (
    <Component
      className={baseClasses}
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
      aria-label={ariaLabel}
      role={role}
      type={onClick ? "button" : undefined}
    >
      <div className="flex h-full w-full items-center justify-center">{children}</div>
    </Component>
  );
}

/**
 * Mobile Touch Button
 *
 * A specialized version of MobileTouchArea optimized for button interactions
 */
interface MobileTouchButtonProps extends Omit<MobileTouchAreaProps, "role"> {
  /** Button type */
  type?: "button" | "submit" | "reset";
  /** Button variant */
  variant?: "default" | "outline" | "ghost";
}

export function MobileTouchButton({
  children,
  className,
  type: _type = "button",
  variant = "default",
  ...props
}: MobileTouchButtonProps) {
  const variantClasses = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    ghost: "hover:bg-accent hover:text-accent-foreground",
  };

  return (
    <MobileTouchArea
      {...props}
      role="button"
      className={cn(
        "inline-flex items-center justify-center rounded-md px-4 py-2",
        "text-sm font-medium ring-offset-background",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </MobileTouchArea>
  );
}
