import React from 'react';
import { cn } from '@/lib/utils';

interface CardGridProps extends React.HTMLAttributes<HTMLDivElement> {
  // Option pour ajuster le nombre de colonnes par breakpoint
  // Ex: cols={{ sm: 2, md: 3, lg: 4 }}
  // Pour l'instant, utilisons des classes Tailwind responsives fixes
}

const CardGrid = React.forwardRef<HTMLDivElement, CardGridProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3 xl:grid-cols-4',
          // Ajustez le nombre de colonnes et les gaps selon votre design
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardGrid.displayName = 'CardGrid';

export { CardGrid };
