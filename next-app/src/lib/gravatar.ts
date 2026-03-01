import { createHash } from "crypto";

export function getGravatarUrl(email: string, size: number = 200): string {
  const hash = createHash("md5")
    .update(email.trim().toLowerCase())
    .digest("hex");
  return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=${size}`;
}
