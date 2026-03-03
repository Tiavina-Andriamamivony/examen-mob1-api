# AuthApi

All URIs are relative to _http://localhost:8080_

| Method                                                      | HTTP request                          | Description                                        |
| ----------------------------------------------------------- | ------------------------------------- | -------------------------------------------------- |
| [**confirmPasswordReset**](AuthApi.md#confirmpasswordreset) | **POST** /auth/reset-password/confirm | Confirm password reset with token and new password |
| [**requestPasswordReset**](AuthApi.md#requestpasswordreset) | **POST** /auth/reset-password         | Request a password reset token                     |
| [**signIn**](AuthApi.md#signin)                             | **POST** /auth/sign-in                | Login with and existing account                    |
| [**signUp**](AuthApi.md#signup)                             | **POST** /auth/sign-up                | Create new account with basic user role            |

## confirmPasswordReset

> ConfirmPasswordReset200Response confirmPasswordReset(resetPasswordConfirm)

Confirm password reset with token and new password

### Example

```ts
import {
  Configuration,
  AuthApi,
} from '';
import type { ConfirmPasswordResetRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AuthApi();

  const body = {
    // ResetPasswordConfirm (optional)
    resetPasswordConfirm: ...,
  } satisfies ConfirmPasswordResetRequest;

  try {
    const data = await api.confirmPasswordReset(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

| Name                     | Type                                            | Description | Notes      |
| ------------------------ | ----------------------------------------------- | ----------- | ---------- |
| **resetPasswordConfirm** | [ResetPasswordConfirm](ResetPasswordConfirm.md) |             | [Optional] |

### Return type

[**ConfirmPasswordReset200Response**](ConfirmPasswordReset200Response.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`

### HTTP response details

| Status code | Description | Response headers |
| ----------- | ----------- | ---------------- |
| **200**     | OK          | -                |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

## requestPasswordReset

> ResetPasswordResponse requestPasswordReset(resetPasswordRequest)

Request a password reset token

### Example

```ts
import {
  Configuration,
  AuthApi,
} from '';
import type { RequestPasswordResetRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AuthApi();

  const body = {
    // ResetPasswordRequest (optional)
    resetPasswordRequest: ...,
  } satisfies RequestPasswordResetRequest;

  try {
    const data = await api.requestPasswordReset(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

| Name                     | Type                                            | Description | Notes      |
| ------------------------ | ----------------------------------------------- | ----------- | ---------- |
| **resetPasswordRequest** | [ResetPasswordRequest](ResetPasswordRequest.md) |             | [Optional] |

### Return type

[**ResetPasswordResponse**](ResetPasswordResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`

### HTTP response details

| Status code | Description | Response headers |
| ----------- | ----------- | ---------------- |
| **200**     | OK          | -                |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

## signIn

> SignInResult signIn(credentials)

Login with and existing account

### Example

```ts
import {
  Configuration,
  AuthApi,
} from '';
import type { SignInRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AuthApi();

  const body = {
    // Credentials (optional)
    credentials: ...,
  } satisfies SignInRequest;

  try {
    const data = await api.signIn(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

| Name            | Type                          | Description | Notes      |
| --------------- | ----------------------------- | ----------- | ---------- |
| **credentials** | [Credentials](Credentials.md) |             | [Optional] |

### Return type

[**SignInResult**](SignInResult.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`

### HTTP response details

| Status code | Description | Response headers |
| ----------- | ----------- | ---------------- |
| **200**     | OK          | -                |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

## signUp

> SignUpResult signUp(credentials)

Create new account with basic user role

### Example

```ts
import {
  Configuration,
  AuthApi,
} from '';
import type { SignUpRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AuthApi();

  const body = {
    // Credentials (optional)
    credentials: ...,
  } satisfies SignUpRequest;

  try {
    const data = await api.signUp(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

| Name            | Type                          | Description | Notes      |
| --------------- | ----------------------------- | ----------- | ---------- |
| **credentials** | [Credentials](Credentials.md) |             | [Optional] |

### Return type

[**SignUpResult**](SignUpResult.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`

### HTTP response details

| Status code | Description | Response headers |
| ----------- | ----------- | ---------------- |
| **200**     | OK          | -                |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
