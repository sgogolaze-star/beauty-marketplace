"use client";
import type { RegistrationType } from "@/lib/provider-validation";

export function AccountTypeSelector({
  value,
  onChange,
  providersOnly = false,
}: {
  value: RegistrationType;
  onChange: (value: RegistrationType) => void;
  providersOnly?: boolean;
}) {
  const choices = providersOnly
    ? ([
        ["business", "Business"],
        ["professional", "Individual professional"],
      ] as const)
    : ([
        ["customer", "Customer"],
        ["business", "Business"],
        ["professional", "Individual professional"],
      ] as const);
  return (
    <fieldset className="account-types">
      <legend>{providersOnly ? "Provider type" : "I’m joining as a"}</legend>
      <div className="account-segments">
        {choices.map(([kind, label]) => (
          <label key={kind}>
            <input
              type="radio"
              name={providersOnly ? "provider_type" : "registration_kind"}
              value={kind}
              checked={value === kind}
              onChange={() => onChange(kind)}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
