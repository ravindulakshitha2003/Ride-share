// Calls for forgot password and email verification (Identity Service, sent by Resend).
// The Resend API key lives on the server only; the app just sends the email and the code.
import client from './client';

// true = fake responses for testing without a server. The test code is always 123456.
const MOCK = false;
const MOCK_CODE = '123456';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Step 1 of forgot password: email a 6-digit code.
export async function requestPasswordReset(email) {
  if (MOCK) {
    await wait(500);
    return { retryAfter: 30 };
  }

  const res = await client.post('/api/auth/forgot-password', { email });

  return res.data;
}

// Step 2: check the code. Returns { resetToken } for step 3.
export async function verifyResetCode(email, code) {
  if (MOCK) {
    await wait(500);
    if (code !== MOCK_CODE) throw { response: { data: { message: 'That code is not correct.' } } };
    return { resetToken: 'mock-reset-token' };
  }

  const res = await client.post('/api/auth/verify-reset-code', { email, code });

  return res.data;
}

// Step 3: set the new password.
export async function resetPassword(resetToken, newPassword) {
  if (MOCK) {
    await wait(500);
    return { message: 'Password updated.' };
  }

  const res = await client.post('/api/auth/reset-password', {
    resetToken,
    newPassword,
  });

  return res.data;
}

// Registration: confirm the email with the 6-digit code.
export async function verifyEmailCode(email, code) {
  if (MOCK) {
    await wait(500);
    if (code !== MOCK_CODE) throw { response: { data: { message: 'That code is not correct.' } } };
    return { emailVerified: true };
  }

  const res = await client.post('/api/auth/verify-email', { email, code });

  return res.data;
}

// Registration: send a new verification code.
export async function resendEmailCode(email) {
  if (MOCK) {
    await wait(500);
    return { retryAfter: 30 };
  }

  const res = await client.post('/api/auth/resend-verification', { email });

  return res.data;
}
