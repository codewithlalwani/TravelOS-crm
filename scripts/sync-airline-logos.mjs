import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const AIRLINES_URL = "https://api.travelpayouts.com/data/en/airlines.json";
const LOGO_URL = (code) => `https://pics.avs.io/200/80/${code}.png`;
const outputDir = path.join(process.cwd(), "public", "logos", "airlines");
const concurrency = 12;

await mkdir(outputDir, { recursive: true });

const airlineResponse = await fetch(AIRLINES_URL, {
  headers: { "user-agent": "TravelCRM-airline-logo-sync/1.0" },
});
if (!airlineResponse.ok) throw new Error(`Airline directory failed: HTTP ${airlineResponse.status}`);

const airlines = (await airlineResponse.json())
  .filter((airline) => /^[A-Z0-9]{2}$/i.test(airline.code || ""))
  .map((airline) => ({
    code: airline.code.toUpperCase(),
    name: airline.name_translations?.en || airline.name || airline.code,
    isLowCost: Boolean(airline.is_lowcost),
  }))
  .filter((airline, index, all) => all.findIndex((item) => item.code === airline.code) === index)
  .sort((a, b) => a.code.localeCompare(b.code));

const downloaded = [];
let cursor = 0;

async function worker() {
  while (cursor < airlines.length) {
    const airline = airlines[cursor++];
    const response = await fetch(LOGO_URL(airline.code), {
      headers: { "user-agent": "TravelCRM-airline-logo-sync/1.0" },
    });
    if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) continue;

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length < 100) continue;

    const file = `${airline.code.toLowerCase()}.png`;
    await writeFile(path.join(outputDir, file), bytes);
    downloaded.push({
      ...airline,
      file: `/logos/airlines/${file}`,
      emailUrl: LOGO_URL(airline.code),
    });
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));
downloaded.sort((a, b) => a.code.localeCompare(b.code));

await writeFile(
  path.join(outputDir, "catalog.json"),
  `${JSON.stringify({ source: AIRLINES_URL, generatedAt: new Date().toISOString(), airlines: downloaded }, null, 2)}\n`
);

console.log(`Downloaded ${downloaded.length}/${airlines.length} airline logos to ${outputDir}`);

