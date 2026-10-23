"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import type { Database } from "@/lib/database.types";
import { providerCategories, workModes } from "@/lib/provider-validation";
import { AccountTypeSelector } from "@/components/account-type-selector";
import { SubmitButton } from "@/components/submit-button";
import { submitApplication } from "@/app/onboarding/actions";
type Application = Database["public"]["Tables"]["provider_applications"]["Row"];
export function ProviderForm({
  application,
  initialKind,
  defaultContactName,
}: {
  application: Application | null;
  initialKind: "business" | "professional";
  defaultContactName: string;
}) {
  const [kind, setKind] = useState(initialKind);
  const [workMode, setWorkMode] = useState(
    application?.work_mode ??
      (initialKind === "business" ? "studio" : "mobile"),
  );
  const [categories, setCategories] = useState<string[]>(
    application?.service_categories ?? [],
  );
  const [state, formAction] = useActionState(submitApplication, {
    error: "",
    values: null,
    categories: null,
  });
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state.error) errorRef.current?.focus();
  }, [state]);
  const [operatingStatus, setOperatingStatus] = useState(
    application?.operating_status ??
      (initialKind === "business" ? "company" : "individual"),
  );
  return (
    <form
      action={formAction}
      onReset={(event) => event.preventDefault()}
      className="stack provider-form"
    >
      {state.error && (
        <p className="notice" role="alert" tabIndex={-1} ref={errorRef}>
          {state.error}
        </p>
      )}
      <AccountTypeSelector
        value={kind}
        onChange={(value) =>
          setKind(value === "professional" ? "professional" : "business")
        }
        providersOnly
      />
      <h2>1. Your contact details</h2>
      <p className="form-note">
        Required unless marked optional. Applications are for providers
        operating in Georgia.
      </p>
      <label>
        {kind === "business"
          ? "Business or studio name"
          : "Professional display name"}
        <input
          name="public_name"
          required
          minLength={2}
          maxLength={150}
          defaultValue={
            state.values?.public_name ?? application?.public_name ?? ""
          }
        />
      </label>
      <label>
        {kind === "business" ? "Contact person’s full name" : "Your full name"}
        <input
          name="contact_name"
          autoComplete="name"
          required
          minLength={2}
          maxLength={100}
          defaultValue={
            state.values?.contact_name ??
            application?.contact_name ??
            defaultContactName
          }
        />
      </label>
      <label>
        Phone number
        <input
          name="phone"
          type="tel"
          autoComplete="tel"
          required
          maxLength={26}
          placeholder="+995 …"
          defaultValue={state.values?.phone ?? application?.phone ?? ""}
        />
      </label>
      <h2>2. Your services</h2>
      <label>
        City
        <input
          name="city"
          autoComplete="address-level2"
          required
          minLength={2}
          maxLength={100}
          defaultValue={state.values?.city ?? application?.city ?? ""}
        />
      </label>
      <label>
        Where do you provide services?
        <select
          name="work_mode"
          value={workMode}
          onChange={(event) => setWorkMode(event.target.value)}
        >
          {Object.entries(workModes).map(([value, label]) => (
            <option value={value} key={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Workspace address or service area
        <input
          name="address_or_area"
          required
          minLength={5}
          maxLength={300}
          defaultValue={
            state.values?.address_or_area ?? application?.address_or_area ?? ""
          }
        />
        <small>
          Give your workspace address, or the areas you travel to. This contact
          information is private to you and our review team.
        </small>
      </label>
      <fieldset className="category-checks">
        <legend>Services you provide</legend>
        {providerCategories.map((category) => (
          <label key={category}>
            <input
              type="checkbox"
              name="service_categories"
              value={category}
              checked={categories.includes(category)}
              onChange={(event) =>
                setCategories((current) =>
                  event.target.checked
                    ? [...current, category]
                    : current.filter((value) => value !== category),
                )
              }
            />
            {category}
          </label>
        ))}
      </fieldset>
      <label>
        Years of professional experience
        <input
          name="experience_years"
          type="number"
          required
          min={0}
          max={80}
          defaultValue={
            state.values?.experience_years ?? application?.experience_years ?? 0
          }
        />
      </label>
      <label>
        About your services
        <textarea
          name="description"
          required
          minLength={30}
          maxLength={3000}
          defaultValue={
            state.values?.description ?? application?.description ?? ""
          }
        />
        <small>
          At least 30 characters. This description will be copied to your
          private draft studio if approved.
        </small>
      </label>
      <label>
        Website or portfolio link (optional)
        <input
          name="portfolio_url"
          type="url"
          placeholder="https://…"
          maxLength={500}
          defaultValue={
            state.values?.portfolio_url ?? application?.portfolio_url ?? ""
          }
        />
      </label>
      <h2>3. Provider identity</h2>
      <p className="form-note">
        This can differ from your public name. These details stay in your
        private application for our review team.
      </p>
      <label>
        Operating status
        <select
          name="operating_status"
          value={operatingStatus}
          onChange={(event) => setOperatingStatus(event.target.value)}
        >
          <option value="company">Registered company</option>
          <option value="sole_trader">
            Registered individual entrepreneur
          </option>
          <option value="individual">Individual / not yet registered</option>
        </select>
      </label>
      <label>
        Legal provider name
        <input
          name="legal_name"
          required
          minLength={2}
          maxLength={150}
          defaultValue={
            state.values?.legal_name ?? application?.legal_name ?? ""
          }
        />
        <small>
          Registered business name, or your full legal name if applying as an
          individual.
        </small>
      </label>
      <label>
        Provider contact address
        <input
          name="contact_address"
          required
          minLength={5}
          maxLength={300}
          autoComplete="street-address"
          defaultValue={
            state.values?.contact_address ?? application?.contact_address ?? ""
          }
        />
        <small>
          Your registered address, or a reliable contact address if you are not
          registered. This is separate from the area where you offer services.
        </small>
      </label>
      <label>
        Country
        <input value="Georgia" readOnly autoComplete="country-name" />
      </label>
      <label hidden={operatingStatus !== "company"}>
        Company registration code (optional)
        <input
          disabled={operatingStatus !== "company"}
          name="registration_number"
          maxLength={64}
          defaultValue={
            state.values?.registration_number ??
            application?.registration_number ??
            ""
          }
        />
        <small>
          For companies only: a public business registry code. Do not enter a
          personal identification number.
        </small>
      </label>
      <label>
        Qualifications or relevant registrations (optional)
        <textarea
          name="qualification_summary"
          maxLength={1000}
          defaultValue={
            state.values?.qualification_summary ??
            application?.qualification_summary ??
            ""
          }
        />
        <small>
          Briefly describe qualifications relevant to your services. Do not
          upload ID documents or include client or health information.
        </small>
      </label>
      <h2>4. Confirm and submit</h2>
      <label className="consent-check">
        <input type="checkbox" name="details_confirmed" required />I confirm
        these details are accurate and I’m authorised to offer the services
        listed, with any registrations or qualifications required for my
        services.
      </label>
      <p className="muted-small">
        Your application is private. Submission does not publish a listing or
        guarantee approval. Your account email is used for account access; this
        form supports provider assessment. Our team’s decision and any rejection
        reason will appear here.
      </p>
      <SubmitButton>
        {application ? "Submit updated application" : "Submit for review"}
      </SubmitButton>
    </form>
  );
}
