// src/components/layout/header.tsx
import React from "react";
import { checkUserPermission } from "@/lib/auth/server-auth";
import { HeaderClient } from "./header-client";

export async function Header() {
  const { isAuthorized } = await checkUserPermission("admin:access");

  return <HeaderClient isAdmin={isAuthorized} />;
}
