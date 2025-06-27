"use client";

// src/components/auth/__tests__/Can.test.tsx - Version finale corrigée
import { render, screen, waitFor } from '@testing-library/react';
import { Can } from '../Can'; // L'import est sensible à la casse, 'Can' et non 'can'
import { useAuth } from '@/hooks/use-auth';

// Mock du hook useAuth
jest.mock('@/hooks/use-auth');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('<Can />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- Test 1: L'utilisateur a la permission ---
  it('should render children when user has permission', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123' } as any,
      role: 'admin',
      isLoading: false,
      checkPermission: (p) => p === 'admin:access',
    });

    render(
      <Can permission="admin:access">
        <div>Admin Content</div>
      </Can>
    );

    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });

  // --- Test 2: L'utilisateur n'a PAS la permission ---
  it('should render fallback when user does not have permission', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123' } as any,
      role: 'user',
      isLoading: false,
      checkPermission: () => false,
    });

    render(
      <Can permission="admin:access" fallback={<div>Access Denied</div>}>
        <div>Admin Content</div>
      </Can>
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  // --- Test 3: En chargement, SANS affichage pendant le chargement ---
  it('should render nothing when loading and showWhileLoading is false', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      role: null,
      isLoading: true,
      checkPermission: () => false,
    });

    const { container } = render(
      <Can permission="admin:access" showWhileLoading={false}>
        <div>Content</div>
      </Can>
    );

    await waitFor(() => {
        expect(container).toBeEmptyDOMElement();
    });
  });

  // --- Test 4: En chargement, AVEC affichage pendant le chargement ---
  it('should render fallback when loading and showWhileLoading is true', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      role: null,
      isLoading: true,
      checkPermission: () => false,
    });

    render(
      <Can 
        permission="admin:access" 
        showWhileLoading={true}
        fallback={<div>Loading...</div>}
      >
        <div>Content</div>
      </Can>
    );
    
    await waitFor(() => {
        expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  // --- Test 5: Permission refusée, même si showWhileLoading est true ---
  it('should render fallback if permission is false, even if showWhileLoading is true', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123' } as any,
      role: 'user',
      isLoading: false, // Chargement terminé
      checkPermission: () => false,
    });

    render(
      <Can 
        permission="admin:access" 
        showWhileLoading={true} // N'a pas d'impact si isLoading est false
        fallback={<div>Access Denied</div>}
      >
        <div>Admin Content</div>
      </Can>
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });
});
