import countryCodes from "../../app/utils/country-code.json";

interface CountryCodeEntry {
  name: string;
  dial_code: string;
  code: string;
}

const NAME_BY_CODE = new Map((countryCodes as CountryCodeEntry[]).map((c) => [c.code, c.name]));

/**
 * Resolves an ISO 3166-1 alpha-2 code (what CountryAutocomplete submits) to its display name.
 * Falls back to the input so an unknown or already-expanded value still renders something.
 */
export function countryNameFromCode(code: string | null | undefined): string | null {
  if (!code) return null;
  return NAME_BY_CODE.get(code) ?? code;
}
