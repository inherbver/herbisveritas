import { NextResponse } from "next/server";
import { checkForUnauthorizedAdmins } from "@/lib/admin/monitoring-service";
import { checkUserPermission } from "@/lib/auth/server-auth";

export async function GET() {
  try {
    // 1. Secure the endpoint: only admins can access
    const { isAuthorized, user, error } = await checkUserPermission("admin:access");
    if (!isAuthorized) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 403 });
    }

    // 2. Perform the security check
    const unauthorizedAdmins = await checkForUnauthorizedAdmins();

    // 3. Return the results
    return NextResponse.json({
      success: true,
      threats: unauthorizedAdmins,
      timestamp: new Date().toISOString(),
      checked_by: user?.id,
    });
  } catch (error) {
    console.error("[API /check-admins] Internal Server Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
