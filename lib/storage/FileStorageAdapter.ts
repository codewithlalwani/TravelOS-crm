import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export interface StoredFile {
  /** Relative path used both to write to disk and to serve back via the files route. */
  relativePath: string;
}

const uploadRoot = path.resolve(process.cwd(), process.env.UPLOAD_DIR || "./uploads");

/**
 * Local-disk file storage, behind an interface so a later swap to S3-style object
 * storage only touches this file.
 */
export async function saveUploadedFile(
  bookingId: number,
  originalName: string,
  buffer: Buffer
): Promise<StoredFile> {
  const bookingDir = path.join(uploadRoot, String(bookingId));
  await fs.mkdir(bookingDir, { recursive: true });

  const safeExt = path.extname(originalName).slice(0, 10);
  const fileName = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${safeExt}`;
  const fullPath = path.join(bookingDir, fileName);
  await fs.writeFile(fullPath, buffer);

  return { relativePath: `${bookingId}/${fileName}` };
}

export async function readStoredFile(relativePath: string): Promise<Buffer> {
  const fullPath = path.join(uploadRoot, relativePath);
  return fs.readFile(fullPath);
}

export function storedFileUrl(relativePath: string): string {
  return `/api/files/${relativePath}`;
}
