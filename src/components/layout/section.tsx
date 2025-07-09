import React from "react";
import { cn } from "@/utils/cn";

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export function Section({ className, children, ...props }: SectionProps) {
  return (
    <section className={cn("py-12 md:py-16 lg:py-20", className)} {...props}>
      {children}
    </section>
  );
}
