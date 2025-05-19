[
{
"name": "rls_disabled_in_public",
"title": "RLS Disabled in Public",
"level": "ERROR",
"facing": "EXTERNAL",
"categories": [
"SECURITY"
],
"description": "Detects cases where row level security (RLS) has not been enabled on tables in schemas exposed to PostgREST",
"detail": "Table \\`public.product_translations\\` is public, but RLS has not been enabled.",
"remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public",
"metadata": {
"name": "product_translations",
"type": "table",
"schema": "public"
},
"cache_key": "rls_disabled_in_public_public_product_translations"
}
]

[
{
"name": "function_search_path_mutable",
"title": "Function Search Path Mutable",
"level": "WARN",
"facing": "EXTERNAL",
"categories": [
"SECURITY"
],
"description": "Detects functions where the search_path parameter is not set.",
"detail": "Function \\`public.update_updated_at_column\\` has a role mutable search_path",
"remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable",
"metadata": {
"name": "update_updated_at_column",
"type": "function",
"schema": "public"
},
"cache_key": "function_search_path_mutable_public_update_updated_at_column_873d38e2d5763140db06f687c34684b1"
},
{
"name": "function_search_path_mutable",
"title": "Function Search Path Mutable",
"level": "WARN",
"facing": "EXTERNAL",
"categories": [
"SECURITY"
],
"description": "Detects functions where the search_path parameter is not set.",
"detail": "Function \\`public.custom_access_token_hook\\` has a role mutable search_path",
"remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable",
"metadata": {
"name": "custom_access_token_hook",
"type": "function",
"schema": "public"
},
"cache_key": "function_search_path_mutable_public_custom_access_token_hook_07a831c08d7ca35371692c53149499f7"
},
{
"name": "function_search_path_mutable",
"title": "Function Search Path Mutable",
"level": "WARN",
"facing": "EXTERNAL",
"categories": [
"SECURITY"
],
"description": "Detects functions where the search_path parameter is not set.",
"detail": "Function \\`public.upsert_cart_item\\` has a role mutable search_path",
"remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable",
"metadata": {
"name": "upsert_cart_item",
"type": "function",
"schema": "public"
},
"cache_key": "function_search_path_mutable_public_upsert_cart_item_1d60867db492b60e81a1a94dd01e07be"
},
{
"name": "function_search_path_mutable",
"title": "Function Search Path Mutable",
"level": "WARN",
"facing": "EXTERNAL",
"categories": [
"SECURITY"
],
"description": "Detects functions where the search_path parameter is not set.",
"detail": "Function \\`public.handle_new_user\\` has a role mutable search_path",
"remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable",
"metadata": {
"name": "handle_new_user",
"type": "function",
"schema": "public"
},
"cache_key": "function_search_path_mutable_public_handle_new_user_601daf914e51e81de737db2d0989d574"
},
{
"name": "auth_otp_long_expiry",
"title": "Auth OTP long expiry",
"level": "WARN",
"facing": "EXTERNAL",
"categories": [
"SECURITY"
],
"description": "OTP expiry exceeds recommended threshold",
"detail": "We have detected that you have enabled the email provider with the OTP expiry set to more than an hour. It is recommended to set this value to less than an hour.",
"cache_key": "auth_otp_long_expiry",
"remediation": "https://supabase.com/docs/guides/platform/going-into-prod#security",
"metadata": {
"type": "auth",
"entity": "Auth"
}
},
{
"name": "auth_leaked_password_protection",
"title": "Leaked Password Protection Disabled",
"level": "WARN",
"facing": "EXTERNAL",
"categories": [
"SECURITY"
],
"description": "Leaked password protection is currently disabled.",
"detail": "Supabase Auth prevents the use of compromised passwords by checking against HaveIBeenPwned.org. Enable this feature to enhance security.",
"cache_key": "auth_leaked_password_protection",
"remediation": "https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection",
"metadata": {
"type": "auth",
"entity": "Auth"
}
}
]

[
{
"name": "function_search_path_mutable",
"title": "Function Search Path Mutable",
"level": "WARN",
"facing": "EXTERNAL",
"categories": [
"SECURITY"
],
"description": "Detects functions where the search_path parameter is not set.",
"detail": "Function \\`public.update_updated_at_column\\` has a role mutable search_path",
"remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable",
"metadata": {
"name": "update_updated_at_column",
"type": "function",
"schema": "public"
},
"cache_key": "function_search_path_mutable_public_update_updated_at_column_873d38e2d5763140db06f687c34684b1"
},
{
"name": "function_search_path_mutable",
"title": "Function Search Path Mutable",
"level": "WARN",
"facing": "EXTERNAL",
"categories": [
"SECURITY"
],
"description": "Detects functions where the search_path parameter is not set.",
"detail": "Function \\`public.custom_access_token_hook\\` has a role mutable search_path",
"remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable",
"metadata": {
"name": "custom_access_token_hook",
"type": "function",
"schema": "public"
},
"cache_key": "function_search_path_mutable_public_custom_access_token_hook_07a831c08d7ca35371692c53149499f7"
},
{
"name": "function_search_path_mutable",
"title": "Function Search Path Mutable",
"level": "WARN",
"facing": "EXTERNAL",
"categories": [
"SECURITY"
],
"description": "Detects functions where the search_path parameter is not set.",
"detail": "Function \\`public.upsert_cart_item\\` has a role mutable search_path",
"remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable",
"metadata": {
"name": "upsert_cart_item",
"type": "function",
"schema": "public"
},
"cache_key": "function_search_path_mutable_public_upsert_cart_item_1d60867db492b60e81a1a94dd01e07be"
},
{
"name": "function_search_path_mutable",
"title": "Function Search Path Mutable",
"level": "WARN",
"facing": "EXTERNAL",
"categories": [
"SECURITY"
],
"description": "Detects functions where the search_path parameter is not set.",
"detail": "Function \\`public.handle_new_user\\` has a role mutable search_path",
"remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable",
"metadata": {
"name": "handle_new_user",
"type": "function",
"schema": "public"
},
"cache_key": "function_search_path_mutable_public_handle_new_user_601daf914e51e81de737db2d0989d574"
},
{
"name": "auth_otp_long_expiry",
"title": "Auth OTP long expiry",
"level": "WARN",
"facing": "EXTERNAL",
"categories": [
"SECURITY"
],
"description": "OTP expiry exceeds recommended threshold",
"detail": "We have detected that you have enabled the email provider with the OTP expiry set to more than an hour. It is recommended to set this value to less than an hour.",
"cache_key": "auth_otp_long_expiry",
"remediation": "https://supabase.com/docs/guides/platform/going-into-prod#security",
"metadata": {
"type": "auth",
"entity": "Auth"
}
},
{
"name": "auth_leaked_password_protection",
"title": "Leaked Password Protection Disabled",
"level": "WARN",
"facing": "EXTERNAL",
"categories": [
"SECURITY"
],
"description": "Leaked password protection is currently disabled.",
"detail": "Supabase Auth prevents the use of compromised passwords by checking against HaveIBeenPwned.org. Enable this feature to enhance security.",
"cache_key": "auth_leaked_password_protection",
"remediation": "https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection",
"metadata": {
"type": "auth",
"entity": "Auth"
}
}
]

[
{
"name": "function_search_path_mutable",
"title": "Function Search Path Mutable",
"level": "WARN",
"facing": "EXTERNAL",
"categories": [
"SECURITY"
],
"description": "Detects functions where the search_path parameter is not set.",
"detail": "Function \\`public.update_updated_at_column\\` has a role mutable search_path",
"remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable",
"metadata": {
"name": "update_updated_at_column",
"type": "function",
"schema": "public"
},
"cache_key": "function_search_path_mutable_public_update_updated_at_column_873d38e2d5763140db06f687c34684b1"
},
{
"name": "function_search_path_mutable",
"title": "Function Search Path Mutable",
"level": "WARN",
"facing": "EXTERNAL",
"categories": [
"SECURITY"
],
"description": "Detects functions where the search_path parameter is not set.",
"detail": "Function \\`public.custom_access_token_hook\\` has a role mutable search_path",
"remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable",
"metadata": {
"name": "custom_access_token_hook",
"type": "function",
"schema": "public"
},
"cache_key": "function_search_path_mutable_public_custom_access_token_hook_07a831c08d7ca35371692c53149499f7"
},
{
"name": "function_search_path_mutable",
"title": "Function Search Path Mutable",
"level": "WARN",
"facing": "EXTERNAL",
"categories": [
"SECURITY"
],
"description": "Detects functions where the search_path parameter is not set.",
"detail": "Function \\`public.upsert_cart_item\\` has a role mutable search_path",
"remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable",
"metadata": {
"name": "upsert_cart_item",
"type": "function",
"schema": "public"
},
"cache_key": "function_search_path_mutable_public_upsert_cart_item_1d60867db492b60e81a1a94dd01e07be"
},
{
"name": "function_search_path_mutable",
"title": "Function Search Path Mutable",
"level": "WARN",
"facing": "EXTERNAL",
"categories": [
"SECURITY"
],
"description": "Detects functions where the search_path parameter is not set.",
"detail": "Function \\`public.handle_new_user\\` has a role mutable search_path",
"remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable",
"metadata": {
"name": "handle_new_user",
"type": "function",
"schema": "public"
},
"cache_key": "function_search_path_mutable_public_handle_new_user_601daf914e51e81de737db2d0989d574"
},
{
"name": "auth_otp_long_expiry",
"title": "Auth OTP long expiry",
"level": "WARN",
"facing": "EXTERNAL",
"categories": [
"SECURITY"
],
"description": "OTP expiry exceeds recommended threshold",
"detail": "We have detected that you have enabled the email provider with the OTP expiry set to more than an hour. It is recommended to set this value to less than an hour.",
"cache_key": "auth_otp_long_expiry",
"remediation": "https://supabase.com/docs/guides/platform/going-into-prod#security",
"metadata": {
"type": "auth",
"entity": "Auth"
}
},
{
"name": "auth_leaked_password_protection",
"title": "Leaked Password Protection Disabled",
"level": "WARN",
"facing": "EXTERNAL",
"categories": [
"SECURITY"
],
"description": "Leaked password protection is currently disabled.",
"detail": "Supabase Auth prevents the use of compromised passwords by checking against HaveIBeenPwned.org. Enable this feature to enhance security.",
"cache_key": "auth_leaked_password_protection",
"remediation": "https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection",
"metadata": {
"type": "auth",
"entity": "Auth"
}
}
]

[
{
"name": "function_search_path_mutable",
"title": "Function Search Path Mutable",
"level": "WARN",
"facing": "EXTERNAL",
"categories": [
"SECURITY"
],
"description": "Detects functions where the search_path parameter is not set.",
"detail": "Function \\`public.update_updated_at_column\\` has a role mutable search_path",
"remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable",
"metadata": {
"name": "update_updated_at_column",
"type": "function",
"schema": "public"
},
"cache_key": "function_search_path_mutable_public_update_updated_at_column_873d38e2d5763140db06f687c34684b1"
},
{
"name": "function_search_path_mutable",
"title": "Function Search Path Mutable",
"level": "WARN",
"facing": "EXTERNAL",
"categories": [
"SECURITY"
],
"description": "Detects functions where the search_path parameter is not set.",
"detail": "Function \\`public.custom_access_token_hook\\` has a role mutable search_path",
"remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable",
"metadata": {
"name": "custom_access_token_hook",
"type": "function",
"schema": "public"
},
"cache_key": "function_search_path_mutable_public_custom_access_token_hook_07a831c08d7ca35371692c53149499f7"
},
{
"name": "function_search_path_mutable",
"title": "Function Search Path Mutable",
"level": "WARN",
"facing": "EXTERNAL",
"categories": [
"SECURITY"
],
"description": "Detects functions where the search_path parameter is not set.",
"detail": "Function \\`public.upsert_cart_item\\` has a role mutable search_path",
"remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable",
"metadata": {
"name": "upsert_cart_item",
"type": "function",
"schema": "public"
},
"cache_key": "function_search_path_mutable_public_upsert_cart_item_1d60867db492b60e81a1a94dd01e07be"
},
{
"name": "function_search_path_mutable",
"title": "Function Search Path Mutable",
"level": "WARN",
"facing": "EXTERNAL",
"categories": [
"SECURITY"
],
"description": "Detects functions where the search_path parameter is not set.",
"detail": "Function \\`public.handle_new_user\\` has a role mutable search_path",
"remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable",
"metadata": {
"name": "handle_new_user",
"type": "function",
"schema": "public"
},
"cache_key": "function_search_path_mutable_public_handle_new_user_601daf914e51e81de737db2d0989d574"
},
{
"name": "auth_otp_long_expiry",
"title": "Auth OTP long expiry",
"level": "WARN",
"facing": "EXTERNAL",
"categories": [
"SECURITY"
],
"description": "OTP expiry exceeds recommended threshold",
"detail": "We have detected that you have enabled the email provider with the OTP expiry set to more than an hour. It is recommended to set this value to less than an hour.",
"cache_key": "auth_otp_long_expiry",
"remediation": "https://supabase.com/docs/guides/platform/going-into-prod#security",
"metadata": {
"type": "auth",
"entity": "Auth"
}
},
{
"name": "auth_leaked_password_protection",
"title": "Leaked Password Protection Disabled",
"level": "WARN",
"facing": "EXTERNAL",
"categories": [
"SECURITY"
],
"description": "Leaked password protection is currently disabled.",
"detail": "Supabase Auth prevents the use of compromised passwords by checking against HaveIBeenPwned.org. Enable this feature to enhance security.",
"cache_key": "auth_leaked_password_protection",
"remediation": "https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection",
"metadata": {
"type": "auth",
"entity": "Auth"
}
}
]
