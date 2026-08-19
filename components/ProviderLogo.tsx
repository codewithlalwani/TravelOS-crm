import Image from "next/image";

export function ProviderLogo({
  name,
  logoUrl,
  compact = false,
}: {
  name: string;
  logoUrl?: string | null;
  compact?: boolean;
}) {
  if (!logoUrl) return null;

  return (
    <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded bg-white ${compact ? "h-7 w-16" : "h-10 w-24"}`}>
      <Image
        src={logoUrl}
        alt={`${name} logo`}
        width={160}
        height={64}
        unoptimized
        className="h-full w-full object-contain p-1"
      />
    </span>
  );
}
