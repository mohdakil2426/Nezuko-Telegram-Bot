function getAllowedDashboardEmails(): string[] {
  return (process.env.INSFORGE_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedDashboardEmail(email?: string | null): boolean {
  const allowedEmails = getAllowedDashboardEmails();

  if (allowedEmails.length === 0) {
    return process.env.NODE_ENV !== "production";
  }

  if (!email) {
    return false;
  }

  return allowedEmails.includes(email.toLowerCase());
}
