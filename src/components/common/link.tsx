import React from "react";
import { Link as NavigationLink } from "@/i18n/navigation";
import { cn } from "@/utils/cn";

interface LinkProps extends React.ComponentProps<typeof NavigationLink> {
  className?: string;
  children?: React.ReactNode;
}

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <NavigationLink ref={ref} className={cn("hover:underline", className)} {...props}>
        {children}
      </NavigationLink>
    );
  }
);

Link.displayName = "Link";

export { Link };
