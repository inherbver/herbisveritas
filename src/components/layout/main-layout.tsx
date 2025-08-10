import React from "react";
// Header is no longer rendered here
// Footer is no longer rendered here
import { SkipNavTarget } from "@/components/common";

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    // Structure might be simplified further if Header/Footer were the main purpose
    <div className="flex min-h-screen flex-col">
      {/* Header removed */}
      <SkipNavTarget /> {/* Keep skip navigation target */}
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
      {/* Footer removed */}
    </div>
  );
};

export { MainLayout };
