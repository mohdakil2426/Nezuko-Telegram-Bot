export async function syncSessionToAuthCookie(
  token: string,
  user: { id: string; email: string; profile?: Record<string, unknown> | null }
) {
  const response = await fetch("/api/auth", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "sync-token",
      user,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    let message = "Failed to sync session cookie";

    try {
      const parsed = JSON.parse(text) as { error?: string };
      if (parsed.error) {
        message = parsed.error;
      }
    } catch {
      if (text) {
        message = text;
      }
    }

    throw new Error(message);
  }

  return response;
}
