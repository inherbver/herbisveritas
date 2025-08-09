# Authentication Server Actions

Complete reference for authentication-related Server Actions.

## Overview

Authentication actions handle user registration, login, password management, and session control. All actions integrate with Supabase Auth and include cart migration, audit logging, and internationalization support.

## Actions

### loginAction

Authenticates a user and migrates their guest cart if applicable.

**Signature**

```typescript
async function loginAction(
  prevState: ActionResult<null> | undefined,
  formData: FormData
): Promise<ActionResult<null>>;
```

**Parameters**

| Name        | Type                              | Required | Description                                       |
| ----------- | --------------------------------- | -------- | ------------------------------------------------- |
| `prevState` | `ActionResult<null> \| undefined` | Yes      | Previous action state for progressive enhancement |
| `formData`  | `FormData`                        | Yes      | Form data containing login credentials            |

**FormData Fields**

| Field      | Type     | Validation           | Description          |
| ---------- | -------- | -------------------- | -------------------- |
| `email`    | `string` | Valid email format   | User's email address |
| `password` | `string` | Minimum 8 characters | User's password      |

**Returns**

```typescript
ActionResult<null>;
```

On success, redirects to `/fr/profile/account`. On failure, returns error details.

**Error Handling**

| Error Type            | Message                                    | Cause                |
| --------------------- | ------------------------------------------ | -------------------- |
| `ValidationError`     | Field-specific messages                    | Invalid input format |
| `AuthenticationError` | "Email non confirmé..."                    | Unverified email     |
| `AuthenticationError` | "L'email ou le mot de passe est incorrect" | Invalid credentials  |

**Features**

- Automatic guest cart migration on successful login
- Audit logging for security tracking
- Session persistence via Supabase Auth

**Example**

```typescript
// In a client component
import { useActionState } from 'react'
import { loginAction } from '@/actions/authActions'

function LoginForm() {
  const [state, formAction] = useActionState(loginAction, null)

  return (
    <form action={formAction}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      {state?.error && <Alert>{state.error}</Alert>}
      <button type="submit">Login</button>
    </form>
  )
}
```

---

### signUpAction

Registers a new user account with email verification.

**Signature**

```typescript
async function signUpAction(
  prevState: AuthActionResult | undefined,
  formData: FormData
): Promise<ActionResult<null>>;
```

**Parameters**

| Name        | Type                            | Required | Description            |
| ----------- | ------------------------------- | -------- | ---------------------- |
| `prevState` | `AuthActionResult \| undefined` | Yes      | Previous action state  |
| `formData`  | `FormData`                      | Yes      | Registration form data |

**FormData Fields**

| Field             | Type     | Validation                                              | Description               |
| ----------------- | -------- | ------------------------------------------------------- | ------------------------- |
| `email`           | `string` | Valid email, unique                                     | User's email address      |
| `password`        | `string` | 8+ chars, 1 uppercase, 1 lowercase, 1 number, 1 special | Secure password           |
| `confirmPassword` | `string` | Must match password                                     | Password confirmation     |
| `locale`          | `string` | Default: 'fr'                                           | User's preferred language |

**Password Requirements**

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

**Returns**

```typescript
ActionResult<null>;
```

Success message with instructions to verify email.

**Error Handling**

| Error Type            | Message                 | Cause                    |
| --------------------- | ----------------------- | ------------------------ |
| `ValidationError`     | "emailAlreadyExists"    | Email already registered |
| `ValidationError`     | Field-specific messages | Invalid input            |
| `AuthenticationError` | "genericSignupError"    | Registration failure     |

**Features**

- Sends verification email with localized content
- Creates audit log entry for new registration
- Configurable redirect URL after email verification

**Example**

```typescript
// Registration form component
function SignUpForm() {
  const [state, formAction] = useActionState(signUpAction, null)

  return (
    <form action={formAction}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <input name="confirmPassword" type="password" required />
      <input name="locale" type="hidden" value="fr" />
      {state?.success && (
        <Alert type="success">{state.message}</Alert>
      )}
      <button type="submit">Register</button>
    </form>
  )
}
```

---

### requestPasswordResetAction

Sends a password reset email to the user.

**Signature**

```typescript
async function requestPasswordResetAction(
  prevState: AuthActionResult | undefined,
  formData: FormData
): Promise<ActionResult<null>>;
```

**Parameters**

| Name        | Type                            | Required | Description           |
| ----------- | ------------------------------- | -------- | --------------------- |
| `prevState` | `AuthActionResult \| undefined` | Yes      | Previous action state |
| `formData`  | `FormData`                      | Yes      | Form containing email |

**FormData Fields**

| Field    | Type     | Validation         | Description                |
| -------- | -------- | ------------------ | -------------------------- |
| `email`  | `string` | Valid email format | Account email address      |
| `locale` | `string` | Default: 'fr'      | Language for email content |

**Returns**

```typescript
ActionResult<null>;
```

Always returns success message for security (doesn't reveal if email exists).

**Security Note**
This action always returns a success message regardless of whether the email exists in the system. This prevents email enumeration attacks.

**Example**

```typescript
function ForgotPasswordForm() {
  const [state, formAction] = useActionState(requestPasswordResetAction, null)

  return (
    <form action={formAction}>
      <input name="email" type="email" required />
      <input name="locale" type="hidden" value="fr" />
      {state?.success && <Alert>{state.message}</Alert>}
      <button type="submit">Reset Password</button>
    </form>
  )
}
```

---

### updatePasswordAction

Updates the user's password after verification.

**Signature**

```typescript
async function updatePasswordAction(
  prevState: AuthActionResult | undefined,
  formData: FormData
): Promise<ActionResult<null>>;
```

**Parameters**

| Name        | Type                            | Required | Description           |
| ----------- | ------------------------------- | -------- | --------------------- |
| `prevState` | `AuthActionResult \| undefined` | Yes      | Previous action state |
| `formData`  | `FormData`                      | Yes      | New password data     |

**FormData Fields**

| Field             | Type     | Validation                  | Description           |
| ----------------- | -------- | --------------------------- | --------------------- |
| `password`        | `string` | Same as signup requirements | New password          |
| `confirmPassword` | `string` | Must match password         | Password confirmation |
| `locale`          | `string` | Default: 'fr'               | User's language       |

**Returns**

```typescript
ActionResult<null>;
```

Success message confirming password update.

**Authentication Required**
User must be authenticated (typically via password reset token).

**Example**

```typescript
function UpdatePasswordForm() {
  const [state, formAction] = useActionState(updatePasswordAction, null)

  return (
    <form action={formAction}>
      <input name="password" type="password" required />
      <input name="confirmPassword" type="password" required />
      {state?.success && <Alert type="success">{state.message}</Alert>}
      <button type="submit">Update Password</button>
    </form>
  )
}
```

---

### resendConfirmationEmailAction

Resends the email verification link.

**Signature**

```typescript
async function resendConfirmationEmailAction(email: string): Promise<ActionResult<null>>;
```

**Parameters**

| Name    | Type     | Required | Description                          |
| ------- | -------- | -------- | ------------------------------------ |
| `email` | `string` | Yes      | Email address to resend verification |

**Returns**

```typescript
ActionResult<null>;
```

Confirmation that email was resent.

**Rate Limiting**
Limited to 3 requests per hour per email address.

**Example**

```typescript
async function handleResendEmail(email: string) {
  const result = await resendConfirmationEmailAction(email);

  if (result.success) {
    toast.success(result.message);
  } else {
    toast.error(result.error);
  }
}
```

---

### logoutAction

Logs out the current user and clears their session.

**Signature**

```typescript
async function logoutAction(): Promise<never>;
```

**Parameters**
None - uses current session context.

**Returns**
Never returns - always redirects.

**Behavior**

1. Clears Supabase auth session
2. Clears any client-side state
3. Redirects to home page with logout confirmation
4. On error, redirects with error message

**Redirect URLs**

- Success: `/?logged_out=true`
- Error: `/?logout_error=true&message={error}`

**Example**

```typescript
// Logout button component
function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button type="submit">Logout</button>
    </form>
  )
}
```

## Common Patterns

### Form Integration

All auth actions are designed to work with HTML forms and Next.js Server Actions:

```typescript
<form action={authAction}>
  {/* Form fields */}
</form>
```

### Error Display

Consistent error handling across all actions:

```typescript
{state?.error && (
  <Alert variant="error">{state.error}</Alert>
)}
{state?.validationErrors?.field && (
  <span className="error">{state.validationErrors.field[0]}</span>
)}
```

### Internationalization

All actions support localization via the `locale` field:

```typescript
<input name="locale" type="hidden" value={locale} />
```

## Security Considerations

### Password Security

- Passwords hashed using bcrypt via Supabase Auth
- Minimum complexity requirements enforced
- Password reset tokens expire after 1 hour

### Session Management

- JWT tokens stored in httpOnly cookies
- Sessions expire after 7 days of inactivity
- Refresh tokens rotated on each use

### Audit Logging

All authentication events logged to `audit_logs` table:

- Login attempts (success/failure)
- Registration
- Password changes
- Logout events

### Rate Limiting

Protection against brute force attacks:

- Login: 5 attempts per 15 minutes
- Registration: 10 per hour per IP
- Password reset: 3 per hour per email

## Testing

Each action includes comprehensive tests:

```typescript
// Example test structure
describe("loginAction", () => {
  it("should authenticate valid credentials");
  it("should reject invalid email format");
  it("should reject incorrect password");
  it("should migrate guest cart on login");
  it("should create audit log entry");
  it("should handle unverified email");
});
```

## Related Documentation

- [Cart Actions](./cart-actions.md) - Cart migration on login
- [Profile Actions](./profile-actions.md) - User profile management
- [Admin Actions](./admin-actions.md) - Admin authentication
- [Database Schema](../architecture/database.md) - Auth tables structure
