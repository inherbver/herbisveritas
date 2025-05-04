"use client";

import React from "react";
import { motion } from "framer-motion"; // Import motion
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl"; // Optional for aria-labels

interface QuantityInputProps {
  id: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

export function QuantityInput({
  id,
  value,
  onChange,
  min = 1,
  max = 99, // Or some other reasonable upper limit
  className,
}: QuantityInputProps) {
  const t = useTranslations("QuantityInput"); // Namespace for labels

  const handleDecrement = () => {
    onChange(Math.max(min, value - 1));
  };

  const handleIncrement = () => {
    onChange(Math.min(max, value + 1));
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(event.target.value, 10);
    if (!isNaN(newValue)) {
      onChange(Math.max(min, Math.min(max, newValue)));
    } else if (event.target.value === "") {
      // Allow empty input temporarily, but might revert to min on blur if needed
      // Or handle differently based on UX preference. For now, just let it be.
    }
  };

  // Optional: Handle blur to ensure a valid number or reset to min
  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    if (event.target.value === "" || isNaN(parseInt(event.target.value, 10))) {
      onChange(min); // Reset to minimum if input is empty or invalid on blur
    }
  };

  return (
    <div className={cn("flex items-center", className)}>
      {/* Use asChild to let Button render a motion.button */}
      <Button
        asChild
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0 rounded-r-none" // Adjusted for seamless look
        onClick={handleDecrement}
        disabled={value <= min}
        aria-label={t("decreaseQuantity")}
      >
        <motion.button whileTap={{ scale: 0.9 }}>
          <Minus className="h-4 w-4" />
        </motion.button>
      </Button>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur} // Handle invalid input on blur
        className="h-8 w-14 rounded-none border-x-0 text-center focus-visible:ring-0 focus-visible:ring-offset-0" // Remove horizontal borders & focus ring
        aria-label={t("quantity")}
      />
      {/* Use asChild to let Button render a motion.button */}
      <Button
        asChild
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0 rounded-l-none" // Adjusted for seamless look
        onClick={handleIncrement}
        disabled={value >= max}
        aria-label={t("increaseQuantity")}
      >
        <motion.button whileTap={{ scale: 0.9 }}>
          <Plus className="h-4 w-4" />
        </motion.button>
      </Button>
    </div>
  );
}
