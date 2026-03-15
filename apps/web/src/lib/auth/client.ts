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
    const message = await response.text();
    throw new Error(message || "Failed to sync session cookie");
  }

  return response;
}
