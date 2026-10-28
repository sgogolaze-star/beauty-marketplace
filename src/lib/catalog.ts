import "server-only";
import { createClient } from "./supabase/server";
import { hasSupabase } from "./supabase/env";
import type { PublicProvider } from "@/components/provider-disclosure";
export const categories = [
  "All treatments",
  "Hair",
  "Nails",
  "Skin",
  "Massage",
  "Brows & lashes",
] as const;
export type Venue = {
  id: string;
  slug: string;
  name: string;
  city: string;
  neighborhood: string;
  category: string;
  description: string;
  is_demo: boolean;
  service_address?: string;
};
export type Service = {
  id: string;
  name: string;
  duration_minutes: number;
  price_minor: number;
  currency: string;
};
export const previewVenues: Venue[] = [
  {
    id: "preview-1",
    slug: "studio-muse",
    name: "Studio Muse",
    city: "Tbilisi",
    neighborhood: "Vake",
    category: "Hair",
    description:
      "Thoughtful cuts, soft colour, and a little time to reset. A welcoming space for your next hair chapter.",
    is_demo: true,
  },
  {
    id: "preview-2",
    slug: "the-soft-room",
    name: "The Soft Room",
    city: "Tbilisi",
    neighborhood: "Vera",
    category: "Skin",
    description:
      "Slow down with a fresh approach to skin care. Personal rituals in a quiet, considered space.",
    is_demo: true,
  },
  {
    id: "preview-3",
    slug: "nail-atelier",
    name: "Nail Atelier",
    city: "Tbilisi",
    neighborhood: "Saburtalo",
    category: "Nails",
    description:
      "Small details, beautiful finishes. Express yourself with a fresh set and a moment of care.",
    is_demo: true,
  },
];
export function filterVenues(
  venues: Venue[],
  query: string,
  city: string,
  category: string,
) {
  return venues.filter(
    (v) =>
      `${v.name} ${v.category} ${v.neighborhood}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      v.city.toLowerCase().includes(city.toLowerCase()) &&
      (category === "All treatments" || v.category === category),
  );
}
export async function getCatalog(): Promise<{
  venues: Venue[];
  preview: boolean;
  failed: boolean;
}> {
  if (!hasSupabase())
    return { venues: previewVenues, preview: true, failed: false };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("venues")
    .select("id,slug,name,city,neighborhood,category,description,is_demo")
    .eq("published", true)
    .order("name");
  if (error) return { venues: [], preview: false, failed: true };
  if (!data?.length)
    return { venues: previewVenues, preview: true, failed: false };
  return { venues: data, preview: false, failed: false };
}
export async function getVenue(
  slug: string,
): Promise<{
  venue: Venue;
  services: Service[];
  provider: PublicProvider | null;
  failed: boolean;
} | null> {
  const preview = previewVenues.find((v) => v.slug === slug);
  if (preview)
    return { venue: preview, services: [], provider: null, failed: false };
  if (!hasSupabase()) return null;
  const supabase = await createClient();
  const { data: venue, error } = await supabase
    .from("venues")
    .select(
      "id,slug,name,city,neighborhood,category,description,is_demo,business_id,service_address",
    )
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (error) throw new Error("Unable to load studio.");
  if (!venue) return null;
  const [
    { data: services, error: serviceError },
    { data: provider, error: providerError },
  ] = await Promise.all([
    supabase
      .from("services")
      .select("id,name,duration_minutes,price_minor,currency")
      .eq("venue_id", venue.id)
      .eq("active", true)
      .order("name"),
    supabase
      .from("provider_public_profiles")
      .select(
        "legal_name,operating_status,company_code,contact_email,contact_phone,contact_address,ready",
      )
      .eq("business_id", venue.business_id)
      .maybeSingle(),
  ]);
  return {
    venue,
    services: provider?.ready ? (services ?? []) : [],
    provider,
    failed: Boolean(serviceError || providerError || !provider?.ready),
  };
}
