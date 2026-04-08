export function getWorkOSUserDisplayName(user: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}) {
  const fullName = [user.firstName?.trim(), user.lastName?.trim()].filter(Boolean).join(" ");

  if (fullName) {
    return fullName;
  }

  if (user.email?.trim()) {
    return user.email.trim();
  }

  return "Unknown user";
}
