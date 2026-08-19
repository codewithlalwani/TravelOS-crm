export const ROOM_TYPE_OPTIONS = ["Standard", "Deluxe", "Suite", "Villa", "Executive"];

export const GUEST_TITLE_OPTIONS = ["Mr", "Mrs", "Ms"];

/**
 * Sent verbatim as PayGlocal's `riskData.lodgingData[].cancellationPolicy`. Only "NC" is confirmed
 * from PayGlocal's own sample payload — "FC"/"PC" follow the same two-letter shape but haven't
 * been validated against their API yet, so confirm them before relying on the distinction.
 */
export const CANCELLATION_POLICY_OPTIONS = [
  { value: "NC", label: "Non-cancellable (NC)" },
  { value: "FC", label: "Free cancellation (FC)" },
  { value: "PC", label: "Partially refundable (PC)" },
];

export const COUNTRY_CODE_OPTIONS = ["+91", "+1", "+44", "+61", "+971"];
