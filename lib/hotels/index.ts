import type { HotelSearchAdapter } from "./HotelSearchAdapter";
import { SerpApiHotelAdapter } from "./SerpApiHotelAdapter";

let adapter: HotelSearchAdapter | null = null;

export function getHotelSearchAdapter(): HotelSearchAdapter {
  if (!adapter) adapter = new SerpApiHotelAdapter();
  return adapter;
}

export * from "./HotelSearchAdapter";
