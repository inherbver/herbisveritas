import { render, screen } from '@testing-library/react';
import { CanServer } from '../can-server';
import { checkUserPermission } from '@/lib/auth/server-auth';

// Mock the server-auth module
jest.mock('@/lib/auth/server-auth', () => ({
  checkUserPermission: jest.fn(),
}));

// Mocking React.Fragment to have a test ID
jest.mock('react', () => {
  const originalReact = jest.requireActual('react');
  return {
    ...originalReact,
    Fragment: ({ children }: { children: React.ReactNode }) => <div data-testid="fragment">{children}</div>,
  };
});

describe('<CanServer />', () => {
  beforeEach(() => {
    (checkUserPermission as jest.Mock).mockClear();
  });

  it('should render children when user has permission', async () => {
    (checkUserPermission as jest.Mock).mockResolvedValue({ isAuthorized: true });

    // CanServer is an async component, so we need to handle the promise it returns
    const CanServerComponent = await CanServer({ permission: 'settings:view', children: <div>Visible Content</div> });
    render(CanServerComponent);

    expect(screen.getByText('Visible Content')).toBeInTheDocument();
  });

  it('should render fallback when user does not have permission', async () => {
    (checkUserPermission as jest.Mock).mockResolvedValue({ isAuthorized: false });

    const CanServerComponent = await CanServer({
      permission: 'settings:view',
      children: <div>Hidden Content</div>,
      fallback: <div>Fallback Content</div>,
    });
    render(CanServerComponent);

    expect(screen.queryByText('Hidden Content')).not.toBeInTheDocument();
    expect(screen.getByText('Fallback Content')).toBeInTheDocument();
  });

  it('should render nothing when no fallback is provided and permission is denied', async () => {
    (checkUserPermission as jest.Mock).mockResolvedValue({ isAuthorized: false });

    const CanServerComponent = await CanServer({ permission: 'settings:view', children: <div>Hidden Content</div> });
    const { container } = render(CanServerComponent);

    expect(screen.queryByText('Hidden Content')).not.toBeInTheDocument();
    // The component renders <>{fallback}</> which is null, so the container should be empty or contain just the mocked fragment.
    expect(container).toBeEmptyDOMElement();
  });
});
