# Authentication Server Actions API Reference

## Overview

This module provides server-side authentication actions for HerbisVeritas, handling user login, signup, password reset, and logout functionalities.

## Authentication Action Results

All authentication actions return an `ActionResult<null>` with the following structure:

- `success`: Boolean indicating operation success
- `message`: Optional success message
- `error`: Optional error message
- Possible additional validation errors

## Endpoints

### Login Action

**Function**: `loginAction(prevState, formData)`

#### Parameters

| Parameter   | Type                              | Description           | Validation |
| ----------- | --------------------------------- | --------------------- | ---------- |
| `prevState` | `ActionResult<null> \| undefined` | Previous action state | Optional   |
| `formData`  | `FormData`                        | Login credentials     | Required   |

#### Validation Schema

- `email`: Valid email address
- `password`: Minimum 8 characters

#### Behaviors

- Validates user credentials
- Handles guest user cart migration
- Redirects to `/fr/profile/account` on successful login

#### Possible Errors

- Invalid email format
- Incorrect credentials
- Unconfirmed email
- Unexpected system errors

#### Example

```typescript
const result = await loginAction(previousState, formData);
if (result.success) {
  // Successful login
} else {
  // Handle login error
}
```

### Signup Action

**Function**: `signUpAction(prevState, formData)`

#### Parameters

| Parameter   | Type                            | Description           | Validation |
| ----------- | ------------------------------- | --------------------- | ---------- |
| `prevState` | `AuthActionResult \| undefined` | Previous action state | Optional   |
| `formData`  | `FormData`                      | Signup information    | Required   |

#### Validation Schema

- `email`: Valid email address
- `password`: Complex password requirements
- `confirmPassword`: Must match password

#### Behaviors

- Validates signup data
- Creates Supabase user
- Sends confirmation email
- Logs signup event in audit logs

#### Possible Errors

- Email already registered
- Invalid password
- Mismatched password confirmation

### Password Reset Actions

#### Request Password Reset

**Function**: `requestPasswordResetAction(prevState, formData)`

#### Password Update

**Function**: `updatePasswordAction(prevState, formData)`

#### Resend Confirmation

**Function**: `resendConfirmationEmailAction(email)`

### Logout Action

**Function**: `logoutAction()`

#### Behaviors

- Signs out current user
- Redirects to homepage
- Handles potential logout errors

## Security Considerations

- Uses Zod for robust input validation
- Prevents information disclosure
- Implements comprehensive error logging
- Uses server-side authentication flow

## Error Handling

- Centralized error formatting
- Secure error messages
- Detailed logging for system administrators
- User-friendly error presentations

## Internationalization

- Supports multiple locales
- Dynamic translation of validation messages
- Locale-aware redirect URLs

## Audit and Logging

- Comprehensive operation logging
- Event tracking for signup and authentication events
- Severity-based logging

## Related Services

- Supabase Authentication
- Cart Migration Service
- Audit Logging Service
