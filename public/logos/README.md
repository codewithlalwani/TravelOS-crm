# Travel brand logos

Curated, web-ready brand marks for the travel CRM. Use them from Next.js with paths such as:

```tsx
<Image src="/logos/flights/air-india.svg" alt="Air India" width={120} height={48} />
```

Folders:

- `flights/` — major global and Indian airlines
- `hotels/` — hotel groups and widely used accommodation brands
- `rail/` — major passenger rail operators and networks

The SVG files are sourced from the open-source [Simple Icons](https://simpleicons.org/) and theSVG collections through Iconify. PNG/JPG marks are public website icons fetched through Google's favicon service where a suitable SVG was unavailable.

The airline library also includes region folders sourced from Wikimedia Commons for Gulf, India, Canada, USA, and Australia. See `flights/WIKIMEDIA_SOURCES.md` for the inventory and source notes.

## Full airline catalog

`airlines/` contains the IATA-code catalog used by booking screens and email templates. It is generated from Travelpayouts' public airline directory and logo CDN:

- Local UI path: `/logos/airlines/{lowercase-iata-code}.png`
- Email URL: `https://pics.avs.io/200/80/{IATA_CODE}.png`
- Catalog: `/logos/airlines/catalog.json`
- Refresh command: `npm run logos:sync-airlines`

The current sync contains 930 validated logo images from 1,120 directory entries. Entries without a valid image response are intentionally omitted.

Brand names and logos remain trademarks of their respective owners. Their inclusion here does not imply endorsement. Review each brand's usage guidelines before production use.
