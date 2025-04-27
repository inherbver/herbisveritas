import React from 'react';
import { Header } from '@/components/shared/header';
import { Footer } from '@/components/shared/footer';
import { SkipNavTarget } from '@/components/primitives'; 
import { Container } from './container'; 

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Add SkipNavLink in Header if not already present */}
      <Header />
      <SkipNavTarget /> 
      <main className="flex-grow">
        {/* Optionally wrap children in Container here if every page needs it */}
        {/* Or apply Container within individual page components for more flexibility */}
        {children}
        {/* Example: If you want Container by default:
        <Container className="py-8">
          {children}
        </Container>
        */}
      </main>
      <Footer />
    </div>
  );
};

export { MainLayout };
