export type CabinClass = "Economy" | "Premium Economy" | "Business" | "First";
export type TripType = "Round Trip" | "One Way" | "Multi City";

export interface FlightRouteSegment {
  depAirport: string;
  arrAirport: string;
}

export interface FlightRouteGroup<T> {
  key: "outbound" | "inbound" | `journey-${number}`;
  label: string;
  segments: T[];
}

/**
 * Flight segments are stored in travel order, without an outbound/inbound column. For a round
 * trip, the first segment that reaches the booking destination closes the outbound route; all
 * remaining segments belong to the inbound route. This also handles connections on either side.
 */
export function groupFlightSegments<T extends FlightRouteSegment>(
  segments: T[],
  tripType?: string | null,
  destination?: string | null
): FlightRouteGroup<T>[] {
  if (segments.length === 0) return [];

  if (tripType === "Round Trip" && destination) {
    const normalizedDestination = destination.trim().toUpperCase();
    const outboundEnd = segments.findIndex(
      (segment) => segment.arrAirport.trim().toUpperCase() === normalizedDestination
    );
    if (outboundEnd >= 0 && outboundEnd < segments.length - 1) {
      return [
        { key: "outbound", label: "Outbound flights", segments: segments.slice(0, outboundEnd + 1) },
        { key: "inbound", label: "Inbound flights", segments: segments.slice(outboundEnd + 1) },
      ];
    }
  }

  if (tripType === "Multi City") {
    return segments.map((segment, index) => ({
      key: `journey-${index + 1}`,
      label: `Journey ${index + 1}`,
      segments: [segment],
    }));
  }

  return [{ key: "outbound", label: "Outbound flights", segments }];
}

export const CABIN_CLASS_OPTIONS: CabinClass[] = ["Economy", "Premium Economy", "Business", "First"];
