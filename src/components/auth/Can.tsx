"use client";

import { useAuth } from "@/hooks/use-auth";
import { AppPermission } from "@/config/permissions";

interface CanProps {
  permission: AppPermission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showWhileLoading?: boolean; // Option to render children while auth state is loading
}

/**
 * A client-side component to conditionally render its children based on user permissions.
 * It uses the `useAuth` hook to get the user's role and check permissions.
 * This is suitable for UI elements that are not critical to security but improve user experience.
 *
 * @param permission The permission required to render the children.
 * @param children The content to render if the user has the permission.
 * @param fallback An optional fallback component to render if the user does not have the permission.
 * @param showWhileLoading If true, renders children optimistically while auth state is being fetched.
 */
export function Can({ permission, children, fallback = null, showWhileLoading = false }: CanProps) {
  const { isLoading, checkPermission } = useAuth();

  const hasAccess = checkPermission(permission);

  if (isLoading && !showWhileLoading) {
    // Render nothing (or a loader) while checking auth state to prevent flicker.
    return null;
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
