/**
 * This file defines the roles and permissions for the application.
 * It serves as the single source of truth for the authorization logic.
 */

// Define the available roles, mirroring the `app_role` enum in the database.
export type AppRole = "user" | "editor" | "admin" | "dev";

// Define the permissions available in the application.
// The format is a string literal, typically in the format "action:resource".
export type AppPermission =
  // --- Site & Admin Access ---
  | "admin:access" // Can access the admin dashboard area
  | "settings:view" // Can view site-wide settings
  | "settings:update" // Can update site-wide settings

  // --- Product Management ---
  | "products:read" // Can view products (e.g., in admin lists)
  | "products:create" // Can create new products
  | "products:update" // Can update existing products
  | "products:delete" // Can delete products

  // --- Order Management ---
  | "orders:read:all" // Can view all customer orders
  | "orders:read:own" // Can view their own orders
  | "orders:update:status" // Can change the status of an order

  // --- User & Profile Management ---
  | "profile:read:own" // Can view their own profile
  | "profile:update:own" // Can update their own profile
  | "users:read:all" // Can view a list of all users
  | "users:update:role" // Can change another user's role
  | "users:delete" // Can delete a user account

  // --- Content (Magazine/Blog) Management ---
  | "content:read" // Can read articles (public permission)
  | "content:create" // Can create new articles
  | "content:update" // Can update existing articles
  | "content:delete"; // Can delete articles

/**
 * A map that assigns an array of permissions to each role.
 * This is the core of our RBAC (Role-Based Access Control) system.
 */
export const permissionsByRole: Record<AppRole, AppPermission[]> = {
  // 'dev' has all possible permissions for development and testing.
  dev: [
    "admin:access",
    "settings:view",
    "settings:update",
    "products:read",
    "products:create",
    "products:update",
    "products:delete",
    "orders:read:all",
    "orders:read:own",
    "orders:update:status",
    "profile:read:own",
    "profile:update:own",
    "users:read:all",
    "users:update:role",
    "users:delete",
    "content:read",
    "content:create",
    "content:update",
    "content:delete",
  ],
  // 'admin' has full operational control but cannot perform destructive user actions.
  admin: [
    "admin:access",
    "settings:view",
    "settings:update",
    "products:read",
    "products:create",
    "products:update",
    "products:delete",
    "orders:read:all",
    "orders:read:own",
    "orders:update:status",
    "profile:read:own",
    "profile:update:own",
    "users:read:all",
    "users:update:role",
    "content:read",
    "content:create",
    "content:update",
    "content:delete",
  ],
  // 'editor' can manage products and content.
  editor: [
    "admin:access", // Access to the admin dashboard is required to perform other duties
    "products:read",
    "products:create",
    "products:update",
    "profile:read:own",
    "profile:update:own",
    "content:read",
    "content:create",
    "content:update",
    "content:delete",
  ],
  // 'user' (customer) has permissions for their own data and public content.
  user: [
    "orders:read:own", 
    "profile:read:own", 
    "profile:update:own", 
    "content:read"
  ],
};
