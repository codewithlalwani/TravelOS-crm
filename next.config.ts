import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sequelize's data-types module statically requires optional dialect packages
  // (pg-hstore, sqlite3, tedious, ...) that we never install since only mysql2 is
  // used. Keeping these external stops Turbopack from trying to bundle/resolve them.
  serverExternalPackages: ["sequelize", "mysql2", "pdfkit"],
  experimental: {
    serverActions: {
      // Default is 1mb, which is too small for scanned passport/visa/ticket documents.
      // Set a bit above the 2mb file cap enforced in <FileUpload> to leave room for
      // multipart/form-data boundary and field overhead.
      bodySizeLimit: "2200kb",
    },
  },
};

export default nextConfig;
