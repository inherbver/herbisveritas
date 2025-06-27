import { checkUserPermission } from "@/lib/auth/server-auth";
import { type AppPermission } from "@/config/permissions";

interface CanServerProps {
  permission: AppPermission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * A server-side component to conditionally render its children based on user permissions.
 * It performs the check on the server, ensuring that sensitive content is never sent to the client
 * if the user lacks the required permission.
 *
 * @param permission The permission required to render the children.
 * @param children The content to render if the user has the permission.
 * @param fallback An optional fallback component to render if the user does not have the permission.
 */
export async function CanServer({ permission, children, fallback = null }: CanServerProps) {
  const { isAuthorized } = await checkUserPermission(permission);

  if (isAuthorized) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
