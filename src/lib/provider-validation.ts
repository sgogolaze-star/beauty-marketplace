export const registrationTypes = [
  "customer",
  "business",
  "professional",
] as const;
export type RegistrationType = (typeof registrationTypes)[number];
export const providerCategories = [
  "Hair",
  "Nails",
  "Skin",
  "Massage",
  "Brows & lashes",
] as const;
export const workModes = {
  studio: "At a salon or studio",
  home: "At my home workspace",
  mobile: "I travel to clients",
  mixed: "A mix of locations",
} as const;
export function registrationType(value: unknown): RegistrationType {
  return value === "business" || value === "professional" ? value : "customer";
}
// Metadata is only a navigation hint. Access always comes from approved DB records.
export function registrationDestination(value: unknown, next = "/account") {
  if (next !== "/account") return next;
  const kind = registrationType(value);
  return kind === "customer" ? next : `/onboarding?type=${kind}`;
}
export function providerDetails(form: FormData) {
  const get = (key: string) => String(form.get(key) ?? "").trim();
  const kind = get("provider_type");
  const categories = [
    ...new Set(form.getAll("service_categories").map(String)),
  ];
  const name = get("public_name"),
    contact = get("contact_name"),
    phone = get("phone"),
    city = get("city"),
    area = get("address_or_area"),
    description = get("description"),
    mode = get("work_mode"),
    experience = get("experience_years"),
    url = get("portfolio_url"),
    number = get("registration_number"),
    legalName = get("legal_name"),
    contactAddress = get("contact_address"),
    operatingStatus = get("operating_status"),
    qualifications = get("qualification_summary");
  if (
    !["business", "professional"].includes(kind) ||
    name.length < 2 ||
    name.length > 150 ||
    contact.length < 2 ||
    contact.length > 100 ||
    city.length < 2 ||
    city.length > 100 ||
    area.length < 5 ||
    area.length > 300 ||
    description.length < 30 ||
    description.length > 3000 ||
    !/^\+?[0-9 ()-]{7,25}$/.test(phone) ||
    phone.replace(/\D/g, "").length < 7 ||
    phone.replace(/\D/g, "").length > 15 ||
    !Object.hasOwn(workModes, mode) ||
    !/^\d{1,2}$/.test(experience) ||
    Number(experience) > 80 ||
    !categories.length ||
    categories.some(
      (c) =>
        !providerCategories.includes(c as (typeof providerCategories)[number]),
    ) ||
    number.length > 64 ||
    legalName.length < 2 ||
    legalName.length > 150 ||
    contactAddress.length < 5 ||
    contactAddress.length > 300 ||
    !["company", "sole_trader", "individual"].includes(operatingStatus) ||
    (operatingStatus !== "company" && number !== "") ||
    qualifications.length > 1000 ||
    form.get("details_confirmed") !== "on"
  )
    return null;
  if (url) {
    try {
      const parsed = new URL(url);
      if (
        parsed.protocol !== "https:" ||
        parsed.username ||
        parsed.password ||
        url.length > 500 ||
        /\s/.test(url)
      )
        return null;
    } catch {
      return null;
    }
  }
  return {
    provider_type: kind,
    public_name: name,
    contact_name: contact,
    phone,
    city,
    address_or_area: area,
    work_mode: mode,
    service_categories: categories,
    experience_years: Number(experience),
    description,
    portfolio_url: url,
    registration_number: number,
    legal_name: legalName,
    contact_address: contactAddress,
    operating_status: operatingStatus,
    qualification_summary: qualifications,
    country_code: "GE",
    details_confirmed: true,
  };
}
