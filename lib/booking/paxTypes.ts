export type PaxType = "SRC" | "ADT" | "YTH" | "CHD" | "INF";

export const PAX_TYPES: PaxType[] = ["SRC", "ADT", "YTH", "CHD", "INF"];

export const PAX_TYPE_LABEL: Record<PaxType, string> = {
  SRC: "Senior",
  ADT: "Adult",
  YTH: "Youth",
  CHD: "Child",
  INF: "Infant",
};
