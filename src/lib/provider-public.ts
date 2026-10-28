import { emailAddress } from "./auth-validation.ts";
export const operatingLabels: Record<string, string> = {
  company: "Company",
  sole_trader: "Individual entrepreneur",
  individual: "Individual service provider",
};
export function publicContact(form: FormData) {
  const contact_email = emailAddress(form.get("contact_email"));
  const contact_phone = String(form.get("contact_phone") ?? "").trim();
  const contact_address = String(form.get("contact_address") ?? "").trim();
  if (
    !contact_email ||
    /[?#/]/.test(contact_email) ||
    !/^\+?[0-9 ()-]{7,25}$/.test(contact_phone) ||
    contact_phone.replace(/\D/g, "").length < 7 ||
    contact_phone.replace(/\D/g, "").length > 15 ||
    contact_address.length < 5 ||
    contact_address.length > 300 ||
    form.get("public_confirmed") !== "on"
  )
    return null;
  return { contact_email, contact_phone, contact_address };
}
