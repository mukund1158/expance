import { mkdir, unlink, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";

// Receipt images live outside public/ and are served only through the
// membership-checked /api/receipts route.
const RECEIPTS_DIR = join(process.cwd(), "uploads", "receipts");

export const RECEIPT_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};
export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

export function receiptAbsolutePath(fileName: string): string {
  // basename() strips any path segments a tampered value could carry.
  return join(RECEIPTS_DIR, basename(fileName));
}

export function receiptContentType(fileName: string): string {
  const ext = extname(fileName).toLowerCase();
  for (const [type, e] of Object.entries(RECEIPT_TYPES)) {
    if (e === ext || (ext === ".jpeg" && e === ".jpg")) return type;
  }
  return "application/octet-stream";
}

/** Validates and stores an uploaded receipt. Returns the stored file name. */
export async function saveReceipt(
  file: File,
  txId: string
): Promise<{ fileName: string } | { error: string }> {
  const ext = RECEIPT_TYPES[file.type];
  if (!ext) return { error: "Receipt must be a JPG, PNG or WebP image" };
  if (file.size > MAX_RECEIPT_BYTES) {
    return { error: "Receipt image must be 5MB or smaller" };
  }
  await mkdir(RECEIPTS_DIR, { recursive: true });
  const fileName = `${txId}${ext}`;
  await writeFile(receiptAbsolutePath(fileName), Buffer.from(await file.arrayBuffer()));
  return { fileName };
}

export async function deleteReceiptFile(fileName: string): Promise<void> {
  try {
    await unlink(receiptAbsolutePath(fileName));
  } catch {
    // Already gone — nothing to do.
  }
}
