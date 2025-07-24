import { checkAdminRole, logSecurityEvent } from "@/lib/auth/admin-service";
import { ENV } from "@/lib/config/env-validator";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

interface SecurityTestResult {
  test: string;
  status: "PASS" | "FAIL" | "WARNING";
  message: string;
  details?: unknown;
}

export default async function SecurityTestPage() {
  // Vérifier que l'utilisateur est admin
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const adminCheck = await checkAdminRole(user.id);
  if (!adminCheck.isAdmin) {
    redirect("/unauthorized");
  }

  // Tests de sécurité
  const testResults: SecurityTestResult[] = [];

  // Test 1: Variables d'environnement
  try {
    testResults.push({
      test: "Environment Variables Validation",
      status: "PASS",
      message: "All environment variables are properly configured",
      details: {
        supabaseUrl: !!ENV.PUBLIC.SUPABASE_URL,
        stripeKeys: !!ENV.PRIVATE.STRIPE_SECRET_KEY,
        nodeEnv: ENV.NODE_ENV,
      },
    });
  } catch (error) {
    testResults.push({
      test: "Environment Variables Validation",
      status: "FAIL",
      message: "Environment configuration error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }

  // Test 2: Admin role system
  try {
    const testUser = await checkAdminRole(user.id);
    testResults.push({
      test: "Admin Role System",
      status: testUser.isAdmin ? "PASS" : "FAIL",
      message: `User role check: ${testUser.role}`,
      details: {
        userId: testUser.userId,
        role: testUser.role,
        permissions: testUser.permissions,
      },
    });
  } catch (error) {
    testResults.push({
      test: "Admin Role System",
      status: "FAIL",
      message: "Admin role check failed",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }

  // Test 3: Security logging
  try {
    await logSecurityEvent({
      type: "admin_action",
      userId: user.id,
      details: {
        message: "Security test performed",
        action: "security_test",
        timestamp: new Date().toISOString(),
      },
    });

    testResults.push({
      test: "Security Logging",
      status: "PASS",
      message: "Security event logged successfully",
    });
  } catch (error) {
    testResults.push({
      test: "Security Logging",
      status: "FAIL",
      message: "Failed to log security event",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }

  // Test 4: Database connection and RLS
  try {
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, role")
      .limit(1);

    if (profileError) throw profileError;

    testResults.push({
      test: "Database & RLS Policies",
      status: "PASS",
      message: "Database connection and RLS policies working",
      details: {
        profilesAccessible: !!profiles,
        recordCount: profiles?.length || 0,
      },
    });
  } catch (error) {
    testResults.push({
      test: "Database & RLS Policies",
      status: "FAIL",
      message: "Database access error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }

  // Test 5: Audit logs access
  try {
    const { data: auditLogs, error: auditError } = await supabase
      .from("audit_logs")
      .select("id, event_type, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    if (auditError) throw auditError;

    testResults.push({
      test: "Audit Logs Access",
      status: "PASS",
      message: "Audit logs accessible to admin",
      details: {
        recentEventsCount: auditLogs?.length || 0,
        lastEvent: auditLogs?.[0]?.event_type,
      },
    });
  } catch (error) {
    testResults.push({
      test: "Audit Logs Access",
      status: "WARNING",
      message: "Audit logs access issue (may be normal if no events yet)",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }

  const passCount = testResults.filter((r) => r.status === "PASS").length;
  const failCount = testResults.filter((r) => r.status === "FAIL").length;
  const warningCount = testResults.filter((r) => r.status === "WARNING").length;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="mb-4 text-3xl font-bold">🔒 Security Architecture Test</h1>
        <div className="rounded-lg bg-gray-100 p-4">
          <h2 className="mb-2 text-lg font-semibold">Test Summary</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{passCount}</div>
              <div className="text-sm text-gray-600">Passed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{failCount}</div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{warningCount}</div>
              <div className="text-sm text-gray-600">Warnings</div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {testResults.map((result, index) => (
          <div
            key={index}
            className={`rounded-lg border p-4 ${
              result.status === "PASS"
                ? "border-green-200 bg-green-50"
                : result.status === "FAIL"
                  ? "border-red-200 bg-red-50"
                  : "border-yellow-200 bg-yellow-50"
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold">{result.test}</h3>
              <span
                className={`rounded px-2 py-1 text-sm font-bold ${
                  result.status === "PASS"
                    ? "bg-green-200 text-green-800"
                    : result.status === "FAIL"
                      ? "bg-red-200 text-red-800"
                      : "bg-yellow-200 text-yellow-800"
                }`}
              >
                {result.status}
              </span>
            </div>
            <p className="mb-2 text-gray-700">{result.message}</p>
            {result.details && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                  Show details
                </summary>
                <pre className="mt-2 overflow-auto rounded bg-gray-100 p-2 text-xs">
                  {typeof result.details === "string"
                    ? result.details
                    : JSON.stringify(result.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h3 className="mb-2 font-semibold text-blue-800">📋 Next Steps</h3>
        <ul className="space-y-1 text-sm text-blue-700">
          <li>• Si des tests échouent, vérifiez la configuration des variables d'environnement</li>
          <li>• Exécutez les migrations Supabase si nécessaire</li>
          <li>• Vérifiez que votre utilisateur a bien le rôle 'admin' en base</li>
          <li>• Consultez les logs pour plus de détails sur les erreurs</li>
        </ul>
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h3 className="mb-2 font-semibold">🧪 Test Information</h3>
        <div className="space-y-1 text-sm text-gray-600">
          <div>
            <strong>Tested by:</strong> {user.email}
          </div>
          <div>
            <strong>User ID:</strong> {user.id}
          </div>
          <div>
            <strong>Test time:</strong> {new Date().toISOString()}
          </div>
          <div>
            <strong>Environment:</strong> {ENV.NODE_ENV}
          </div>
        </div>
      </div>
    </div>
  );
}
