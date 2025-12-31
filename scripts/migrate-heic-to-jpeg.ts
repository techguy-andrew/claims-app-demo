/**
 * Migration Script: Convert HEIC attachments to JPEG
 *
 * This script converts existing HEIC/HEIF files in R2 to JPEG format
 * and updates the database records accordingly.
 *
 * SAFETY FEATURES:
 * - Original HEIC files are NEVER deleted (kept as backups)
 * - Non-destructive: only adds new files and updates DB records
 * - Idempotent: safe to run multiple times (skips already converted)
 * - Dry-run mode: preview changes without modifying anything
 *
 * Usage:
 *   pnpm migrate:heic:dry   # Preview changes (dry run)
 *   pnpm migrate:heic       # Execute migration
 */

import { PrismaClient } from "@prisma/client";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import heicConvert from "heic-convert";
import sharp from "sharp";

// Parse CLI args
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");

// Initialize clients
const prisma = new PrismaClient();
const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const R2_BUCKET = process.env.R2_BUCKET_NAME!;
const R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN!;

// Processing delay to avoid rate limits (ms between files)
const BATCH_DELAY = 500;

interface MigrationResult {
  total: number;
  converted: number;
  skipped: number;
  failed: number;
  failures: { id: string; filename: string; error: string }[];
}

/**
 * Check if a file is HEIC/HEIF based on URL, filename, or mimeType
 */
function isHeicFile(
  url: string,
  filename: string,
  mimeType: string
): boolean {
  const lowerUrl = url.toLowerCase();
  const lowerFilename = filename.toLowerCase();
  const lowerMime = mimeType.toLowerCase();
  return (
    lowerUrl.endsWith(".heic") ||
    lowerUrl.endsWith(".heif") ||
    lowerFilename.endsWith(".heic") ||
    lowerFilename.endsWith(".heif") ||
    lowerMime.includes("heic") ||
    lowerMime.includes("heif")
  );
}

/**
 * Check if already converted (URL ends with -converted.jpg or mimeType is jpeg with non-heic URL)
 */
function isAlreadyConverted(url: string, mimeType: string): boolean {
  const lowerUrl = url.toLowerCase();
  return (
    lowerUrl.includes("-converted.jpg") ||
    (mimeType === "image/jpeg" && !isHeicFile(url, "", ""))
  );
}

/**
 * Download file from R2
 */
async function downloadFromR2(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });
  const response = await r2Client.send(command);
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * Upload file to R2
 */
async function uploadToR2(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });
  await r2Client.send(command);
}

/**
 * Get public URL for a key
 */
function getPublicUrl(key: string): string {
  return `${R2_PUBLIC_DOMAIN}/${key}`;
}

/**
 * Extract R2 key from public URL
 */
function getKeyFromUrl(url: string): string {
  return url.replace(`${R2_PUBLIC_DOMAIN}/`, "");
}

/**
 * Generate new JPEG key from HEIC key (non-destructive - adds -converted suffix)
 */
function generateConvertedKey(heicKey: string): string {
  // Remove .heic/.heif and add -converted.jpg
  return heicKey
    .replace(/\.heic$/i, "-converted.jpg")
    .replace(/\.heif$/i, "-converted.jpg");
}

/**
 * Convert filename from HEIC to JPG for display
 */
function convertFilename(filename: string): string {
  return filename
    .replace(/\.heic$/i, ".jpg")
    .replace(/\.heif$/i, ".jpg");
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Migrate a single attachment
 */
async function migrateAttachment(attachment: {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  filename: string;
  publicId: string;
  mimeType: string;
}): Promise<{ success: boolean; error?: string }> {
  const { id, url, filename, publicId, mimeType } = attachment;

  try {
    console.log(`  Processing: ${filename} (${id})`);

    // Check if already converted
    if (isAlreadyConverted(url, mimeType)) {
      console.log(`    → Already converted, skipping`);
      return { success: true };
    }

    // Get the R2 key
    const heicKey = publicId || getKeyFromUrl(url);
    const jpegKey = generateConvertedKey(heicKey);
    const newFilename = convertFilename(filename);

    if (DRY_RUN) {
      console.log(`    [DRY RUN] Would convert:`);
      console.log(`      Original: ${heicKey}`);
      console.log(`      New JPEG: ${jpegKey}`);
      console.log(`      Filename: ${filename} → ${newFilename}`);
      console.log(`      (Original HEIC would be preserved)`);
      return { success: true };
    }

    // Download HEIC file
    console.log(`    Downloading from R2...`);
    const heicBuffer = await downloadFromR2(heicKey);
    console.log(`    Downloaded ${(heicBuffer.length / 1024 / 1024).toFixed(2)} MB`);

    // Convert to JPEG (high quality to minimize loss)
    console.log(`    Converting HEIC to JPEG (quality: 92%)...`);
    const jpegBuffer = await heicConvert({
      buffer: heicBuffer,
      format: "JPEG",
      quality: 0.92,
    });
    const jpegImageBuffer = Buffer.from(jpegBuffer);
    console.log(`    Converted to ${(jpegImageBuffer.length / 1024 / 1024).toFixed(2)} MB`);

    // Upload JPEG (original HEIC remains untouched)
    console.log(`    Uploading JPEG to R2...`);
    await uploadToR2(jpegKey, jpegImageBuffer, "image/jpeg");
    const newUrl = getPublicUrl(jpegKey);

    // Generate thumbnail from converted JPEG
    console.log(`    Generating thumbnail...`);
    let newThumbnailUrl: string | null = null;
    try {
      const thumbnailBuffer = await sharp(jpegImageBuffer)
        .rotate() // Auto-rotate based on EXIF
        .resize(300, 300, { fit: "cover", position: "center" })
        .jpeg({ quality: 80 })
        .toBuffer();

      const thumbnailKey = jpegKey.replace("-converted.jpg", "-converted-thumb.jpg");
      await uploadToR2(thumbnailKey, thumbnailBuffer, "image/jpeg");
      newThumbnailUrl = getPublicUrl(thumbnailKey);
    } catch (thumbError) {
      console.warn(`    Warning: Thumbnail generation failed, using main image`);
      newThumbnailUrl = newUrl;
    }

    // Update database record
    console.log(`    Updating database...`);
    await prisma.attachment.update({
      where: { id },
      data: {
        url: newUrl,
        thumbnailUrl: newThumbnailUrl,
        filename: newFilename,
        mimeType: "image/jpeg",
        publicId: jpegKey,
        format: "jpg",
        size: jpegImageBuffer.length,
      },
    });

    console.log(`    ✓ Successfully migrated (original HEIC preserved in R2)`);
    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`    ✗ Failed: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
}

/**
 * Main migration function
 */
async function migrate(): Promise<MigrationResult> {
  console.log("═".repeat(60));
  console.log("HEIC to JPEG Migration Script");
  console.log("═".repeat(60));

  if (DRY_RUN) {
    console.log("\n⚠️  DRY RUN MODE - No changes will be made\n");
  } else {
    console.log("\n🔒 SAFETY: Original HEIC files will be preserved in R2\n");
  }

  const result: MigrationResult = {
    total: 0,
    converted: 0,
    skipped: 0,
    failed: 0,
    failures: [],
  };

  // Find all HEIC attachments
  console.log("Querying database for HEIC files...");
  const attachments = await prisma.attachment.findMany({
    where: {
      OR: [
        { url: { endsWith: ".heic" } },
        { url: { endsWith: ".HEIC" } },
        { url: { endsWith: ".heif" } },
        { url: { endsWith: ".HEIF" } },
        { filename: { endsWith: ".heic" } },
        { filename: { endsWith: ".HEIC" } },
        { filename: { endsWith: ".heif" } },
        { filename: { endsWith: ".HEIF" } },
        { mimeType: { contains: "heic" } },
        { mimeType: { contains: "heif" } },
      ],
    },
    select: {
      id: true,
      url: true,
      thumbnailUrl: true,
      filename: true,
      publicId: true,
      mimeType: true,
    },
  });

  result.total = attachments.length;
  console.log(`Found ${result.total} HEIC file(s) to process\n`);

  if (result.total === 0) {
    console.log("No HEIC files found. Nothing to migrate.");
    return result;
  }

  // Process each attachment
  for (let i = 0; i < attachments.length; i++) {
    const attachment = attachments[i];
    console.log(`\n[${i + 1}/${result.total}] ${attachment.filename}`);

    // Check if already converted (idempotency check)
    if (isAlreadyConverted(attachment.url, attachment.mimeType)) {
      console.log(`  → Already converted, skipping`);
      result.skipped++;
      continue;
    }

    const migrationResult = await migrateAttachment(attachment);

    if (migrationResult.success) {
      if (DRY_RUN) {
        result.converted++; // Count as "would convert" in dry run
      } else {
        result.converted++;
      }
    } else {
      result.failed++;
      result.failures.push({
        id: attachment.id,
        filename: attachment.filename,
        error: migrationResult.error || "Unknown error",
      });
    }

    // Add delay between files to avoid rate limits
    if (!DRY_RUN && i < attachments.length - 1) {
      await sleep(BATCH_DELAY);
    }
  }

  return result;
}

/**
 * Print final summary
 */
function printSummary(result: MigrationResult): void {
  console.log("\n" + "═".repeat(60));
  console.log(DRY_RUN ? "Dry Run Summary" : "Migration Summary");
  console.log("═".repeat(60));
  console.log(`Total HEIC files found: ${result.total}`);
  console.log(`${DRY_RUN ? "Would convert" : "Converted"}:     ${result.converted}`);
  console.log(`Skipped (already done):  ${result.skipped}`);
  console.log(`Failed:                  ${result.failed}`);

  if (result.failures.length > 0) {
    console.log("\nFailed files:");
    result.failures.forEach((f) => {
      console.log(`  - ${f.filename} (${f.id}): ${f.error}`);
    });
  }

  if (DRY_RUN) {
    console.log("\n💡 Run without --dry-run to execute the migration");
  } else {
    console.log("\n✅ Original HEIC files preserved in R2 as backups");
  }

  console.log("═".repeat(60));
}

// Run migration
migrate()
  .then((result) => {
    printSummary(result);
    process.exit(result.failed > 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error("\nFatal error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
