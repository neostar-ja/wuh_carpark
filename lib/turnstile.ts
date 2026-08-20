import "server-only";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstileToken(
  token: string | undefined,
  remoteIp?: string
): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  // If Turnstile isn't configured yet (e.g. local dev before keys are issued),
  // skip verification so the placeholder component doesn't block testing.
  if (!secretKey) {
    return true;
  }

  if (!token) {
    return false;
  }

  const body = new URLSearchParams();
  body.append("secret", secretKey);
  body.append("response", token);
  if (remoteIp) body.append("remoteip", remoteIp);

  const res = await fetch(VERIFY_URL, {
    method: "POST",
    body,
  });

  if (!res.ok) return false;

  const data = (await res.json()) as { success: boolean };
  return data.success === true;
}
