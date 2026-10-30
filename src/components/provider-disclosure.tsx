import { operatingLabels } from "@/lib/provider-public";
export type PublicProvider = {
  legal_name: string | null;
  operating_status: string | null;
  company_code: string;
  contact_email: string;
  contact_phone: string;
  contact_address: string;
  ready: boolean | null;
};
export function ProviderDisclosure({
  provider,
  location,
}: {
  provider: PublicProvider | null;
  location: string;
}) {
  if (!provider?.ready)
    return (
      <p role="alert">
        Provider details are unavailable. Booking is currently unavailable.
      </p>
    );
  return (
    <section
      className="provider-disclosure"
      aria-label="Service provider details"
    >
      <h2>Your service provider</h2>
      <p className="muted-small">
        This provider supplies your treatment. Contact them about the service or
        an appointment.
      </p>
      <dl>
        <dt>Legal provider</dt>
        <dd>{provider.legal_name}</dd>
        <dt>Provider type</dt>
        <dd>{operatingLabels[provider.operating_status ?? ""]}</dd>
        {provider.company_code && (
          <>
            <dt>Company registration code</dt>
            <dd>{provider.company_code}</dd>
          </>
        )}
        <dt>Service location or area</dt>
        <dd>{location}</dd>
        <dt>Contact address</dt>
        <dd>{provider.contact_address}</dd>
        <dt>Email</dt>
        <dd>
          <a href={`mailto:${encodeURIComponent(provider.contact_email)}`}>
            {provider.contact_email}
          </a>
        </dd>
        <dt>Phone</dt>
        <dd>
          <a href={`tel:${provider.contact_phone.replace(/[^+0-9]/g, "")}`}>
            {provider.contact_phone}
          </a>
        </dd>
      </dl>
      <p className="muted-small">
        Bloom handles the booking. Payment is made directly to the provider at
        the appointment.
      </p>
    </section>
  );
}
