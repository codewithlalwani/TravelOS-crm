import type { FlightSearchAdapter } from "./FlightSearchAdapter";
import { SerpApiFlightAdapter } from "./SerpApiFlightAdapter";

let adapter: FlightSearchAdapter | null = null;

export function getFlightSearchAdapter(): FlightSearchAdapter {
  if (!adapter) adapter = new SerpApiFlightAdapter();
  return adapter;
}

export * from "./FlightSearchAdapter";
