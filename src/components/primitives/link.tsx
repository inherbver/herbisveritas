import React from 'react';
import { Link as LocalizedLink } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';

// Combine LocalizedLink props with standard anchor props, explicitly including className and children
// Utilise les props de LocalizedLink et ajoute les attributs standards d'une ancre HTML,
// en omettant 'href' des attributs HTML pour prioriser celui de LocalizedLink si conflit.
interface LinkProps extends React.ComponentProps<typeof LocalizedLink>, Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  asChild?: boolean;
  // Assure que className et children sont explicitement présents si l'inférence échoue
  className?: string;
  children?: React.ReactNode;
}

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ className, children, asChild, ...props }, ref) => {
    return (
      <LocalizedLink
        ref={ref}
        className={cn(
          'font-medium text-primary underline underline-offset-4 hover:text-primary/90',
          // Ajoutez ici des classes de variantes conditionnelles
          className
        )}
        {...props}
      >
        {children}
      </LocalizedLink>
    );
  }
);

Link.displayName = 'Link';

export { Link };
