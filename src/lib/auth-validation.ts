export function safeNext(value: string | null | undefined): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\r\n]/.test(value)
  )
    return "/account";
  try {
    const url = new URL(value, "https://local.invalid");
    if (url.origin !== "https://local.invalid") return "/account";
    return url.pathname + url.search;
  } catch {
    return "/account";
  }
}

export function credentials(form: FormData) {
  const email = emailAddress(form.get("email"));
  const password = String(form.get("password") ?? "");
  if (!email) return null;
  if (password.length < 8 || password.length > 128) return null;
  return { email, password };
}
export function emailAddress(value: unknown) {
  const email = String(value ?? "").trim();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? email
    : null;
}
export function replacementPassword(form: FormData) {
  const password = String(form.get("password") ?? "");
  return password.length >= 8 &&
    password.length <= 128 &&
    password === form.get("password_confirmation")
    ? password
    : null;
}
export function trustedAuthOrigin(
  requestOrigin: string | null,
  options: {
    configured?: string;
    deployment?: string;
    branch?: string;
    allowLocal: boolean;
  },
) {
  const normalize = (value: string | undefined, hostOnly = false) => {
    if (!value) return null;
    try {
      const url = new URL(hostOnly ? `https://${value}` : value);
      const loopback =
        options.allowLocal &&
        ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
      return (url.protocol === "https:" ||
        (loopback && url.protocol === "http:")) &&
        !url.username &&
        !url.password &&
        url.pathname === "/" &&
        !url.search &&
        !url.hash
        ? url.origin
        : null;
    } catch {
      return null;
    }
  };
  const allowed = [
    normalize(options.configured),
    normalize(options.deployment, true),
    normalize(options.branch, true),
  ].filter((value): value is string => Boolean(value));
  const supplied = normalize(requestOrigin ?? undefined);
  if (supplied && allowed.includes(supplied)) return supplied;
  if (
    supplied &&
    options.allowLocal &&
    ["127.0.0.1", "localhost", "[::1]"].includes(new URL(supplied).hostname)
  )
    return supplied;
  return allowed[0] ?? null;
}
