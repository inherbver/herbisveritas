import { withPermission, withPermissionSafe } from '../server-actions-auth';
import { checkUserPermission } from '../server-auth';

// Mock the server-auth module
jest.mock('../server-auth', () => ({
  checkUserPermission: jest.fn(),
}));

// A simple async function to be used as our server action
const mockAction = jest.fn(async (arg1: string, arg2: number) => {
  if (arg1 === 'throw') {
    throw new Error('Action failed');
  }
  return { result: `Success: ${arg1}, ${arg2}` };
});

describe('Server Action HOFs', () => {
  beforeEach(() => {
    // Clear mocks before each test
    (checkUserPermission as jest.Mock).mockClear();
    mockAction.mockClear();
  });

  describe('withPermission', () => {
    it('should call the action if permission is granted', async () => {
      (checkUserPermission as jest.Mock).mockResolvedValue({ isAuthorized: true });
      const securedAction = withPermission('test:perm', mockAction);

      await expect(securedAction('hello', 123)).resolves.toEqual({ result: 'Success: hello, 123' });
      expect(mockAction).toHaveBeenCalledWith('hello', 123);
    });

    it('should throw an error if permission is denied', async () => {
      (checkUserPermission as jest.Mock).mockResolvedValue({ isAuthorized: false, error: 'Permission denied' });
      const securedAction = withPermission('test:perm', mockAction);

      await expect(securedAction('hello', 123)).rejects.toThrow('Permission denied');
      expect(mockAction).not.toHaveBeenCalled();
    });
  });

  describe('withPermissionSafe', () => {
    it('should return success response if permission is granted', async () => {
      (checkUserPermission as jest.Mock).mockResolvedValue({ isAuthorized: true });
      const securedAction = withPermissionSafe('test:perm', mockAction);

      const response = await securedAction('hello', 123);

      expect(response.success).toBe(true);
      expect(response.data).toEqual({ result: 'Success: hello, 123' });
      expect(response.error).toBeUndefined();
      expect(mockAction).toHaveBeenCalledWith('hello', 123);
    });

    it('should return error response if permission is denied', async () => {
      (checkUserPermission as jest.Mock).mockResolvedValue({ isAuthorized: false, error: 'Permission denied' });
      const securedAction = withPermissionSafe('test:perm', mockAction);

      const response = await securedAction('hello', 123);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Permission denied');
      expect(response.data).toBeUndefined();
      expect(mockAction).not.toHaveBeenCalled();
    });

    it('should handle errors thrown from within the action', async () => {
      (checkUserPermission as jest.Mock).mockResolvedValue({ isAuthorized: true });
      const securedAction = withPermissionSafe('test:perm', mockAction);

      const response = await securedAction('throw', 456);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Action failed');
      expect(response.data).toBeUndefined();
      expect(mockAction).toHaveBeenCalledWith('throw', 456);
    });
  });
});
