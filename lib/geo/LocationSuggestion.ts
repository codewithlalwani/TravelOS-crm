export interface LocationSuggestion {
  /** Ready-to-use label, e.g. "Bali, Indonesia". */
  description: string;
  mainText: string;
  secondaryText: string | null;
  /** e.g. "city", "state", "country". */
  type: string | null;
  /** Google Places `place_id`, used to look up the country via Place Details. Null for non-Google sources. */
  placeId: string | null;
}
