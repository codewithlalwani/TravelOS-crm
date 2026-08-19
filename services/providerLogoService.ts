import { Op } from "sequelize";
import { TravelProviderLogo, type TravelProviderCategory } from "../models/TravelProviderLogo";
import airlineLogoCatalog from "../public/logos/airlines/catalog.json";

export type ProviderLogoInfo = { name: string; url: string; alt: string };

const BUILT_IN_LOGOS: Partial<Record<TravelProviderCategory, Record<string, ProviderLogoInfo>>> = {
  rail: {
    "via rail": { name: "VIA Rail", url: "/via-rail-logo.jpg", alt: "VIA Rail logo" },
    amtrak: { name: "Amtrak", url: "/amtrak-logo.png", alt: "Amtrak logo" },
  },
};

const key = (value: string) => value.trim().toLowerCase();

type AirlineLogo = { code: string; name: string; file: string; emailUrl: string };
const airlineLogos = airlineLogoCatalog.airlines as AirlineLogo[];

function builtInAirlineLogo(value: string): ProviderLogoInfo | undefined {
  const normalized = key(value);
  const airline = airlineLogos.find(
    (candidate) => key(candidate.code) === normalized || key(candidate.name) === normalized
  );
  return airline
    ? { name: airline.name, url: airline.file, alt: `${airline.name} logo` }
    : undefined;
}

export async function providerLogosForNames(
  category: TravelProviderCategory,
  names: Array<string | null | undefined>
): Promise<Record<string, ProviderLogoInfo>> {
  const uniqueNames = [...new Set(names.filter((name): name is string => Boolean(name?.trim())))];
  const result: Record<string, ProviderLogoInfo> = {};

  for (const name of uniqueNames) {
    const builtIn = category === "flight" ? builtInAirlineLogo(name) : BUILT_IN_LOGOS[category]?.[key(name)];
    if (builtIn) result[name] = builtIn;
  }

  if (uniqueNames.length === 0) return result;

  const rows = await TravelProviderLogo.findAll({
    where: {
      category,
      isActive: true,
      [Op.or]: [
        { providerName: { [Op.in]: uniqueNames } },
        { providerCode: { [Op.in]: uniqueNames } },
      ],
    },
    order: [["displayOrder", "ASC"]],
  });

  for (const name of uniqueNames) {
    const normalizedName = key(name);
    const row = rows.find(
      (candidate) => key(candidate.providerName) === normalizedName || key(candidate.providerCode || "") === normalizedName
    );
    if (row) result[name] = { name: row.providerName, url: row.logoUrl, alt: row.altText };
  }

  return result;
}

export function emailLogoUrl(url: string | undefined): string | undefined {
  if (url === "/via-rail-logo.jpg") return "cid:via-rail-logo";
  if (url === "/amtrak-logo.png") return "cid:amtrak-logo";
  const airlineCode = url?.match(/^\/logos\/airlines\/([a-z0-9]{2})\.png$/i)?.[1];
  // Email clients frequently block third-party images. The catalog is synced from
  // pics.avs.io, but email delivery embeds the downloaded copy using this CID.
  if (airlineCode) return `cid:airline-logo-${airlineCode.toLowerCase()}`;
  return /^https:\/\//i.test(url || "") ? url : undefined;
}
