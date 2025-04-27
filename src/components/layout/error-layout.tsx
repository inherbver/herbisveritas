import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Container } from './container';
import { Heading } from '@/components/primitives/heading';
import { Text } from '@/components/primitives/text';

interface ErrorLayoutProps {
  statusCode: number;
  title: string;
  message: string;
  children?: React.ReactNode; // Optional children for more customization
}

const ErrorLayout: React.FC<ErrorLayoutProps> = ({
  statusCode,
  title,
  message,
  children,
}) => {
  return (
    <Container className="flex min-h-[calc(100vh-10rem)] items-center justify-center py-12 text-center">
      <div className="space-y-4">
        <Heading level={1} className="text-6xl font-bold text-primary">{statusCode}</Heading>
        <Heading level={2} className="text-3xl font-semibold">{title}</Heading>
        <Text className="text-muted-foreground">{message}</Text>
        {children && <div className="mt-6">{children}</div>}
        <Button asChild className="mt-8">
          <Link href="/">Retour à l'accueil</Link>
        </Button>
      </div>
    </Container>
  );
};

export { ErrorLayout };
