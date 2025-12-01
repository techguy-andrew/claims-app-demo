import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadToR2, getPublicUrl } from "@/lib/r2";
import sharp from "sharp";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

/**
 * POST /api/claims/[id]/items/[itemId]/attachments
 * Upload file to R2 and save attachment metadata
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id: claimId, itemId } = await params;

    // Verify item exists and belongs to the claim
    const item = await prisma.item.findFirst({
      where: { id: itemId, claimId },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Parse FormData
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 100MB limit" },
        { status: 400 }
      );
    }

    // Generate unique key
    const ext = file.name.split(".").pop() || "bin";
    const randomId = Math.random().toString(36).substring(2, 10);
    const key = `claims/${claimId}/${itemId}/${Date.now()}-${randomId}.${ext}`;

    // Upload to R2
    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadToR2(key, buffer, file.type);

    // Generate URLs
    const url = getPublicUrl(key);
    const isImage = file.type.startsWith("image/");
    let thumbnailUrl: string | null = null;

    // Generate and upload thumbnail for images only
    if (isImage) {
      try {
        const thumbnailBuffer = await sharp(buffer)
          .rotate() // Auto-rotate based on EXIF orientation
          .resize(300, 300, { fit: "cover", position: "center" })
          .jpeg({ quality: 80 })
          .toBuffer();

        const thumbnailKey = `claims/${claimId}/${itemId}/${Date.now()}-${randomId}-thumb.jpg`;
        await uploadToR2(thumbnailKey, thumbnailBuffer, "image/jpeg");
        thumbnailUrl = getPublicUrl(thumbnailKey);
      } catch (thumbError) {
        console.warn("Failed to generate image thumbnail, using full URL:", thumbError);
        thumbnailUrl = url; // Fallback to full URL if thumbnail generation fails
      }
    }

    // Save attachment metadata to database
    const attachment = await prisma.attachment.create({
      data: {
        itemId,
        filename: file.name,
        url,
        thumbnailUrl,
        mimeType: file.type,
        size: file.size,
        width: null,
        height: null,
        publicId: key,
        version: null,
        format: ext,
      },
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    console.error("Failed to upload attachment:", error);
    return NextResponse.json(
      { error: "Failed to upload attachment" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/claims/[id]/items/[itemId]/attachments
 * Get all attachments for an item
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id: claimId, itemId } = await params;

    // Verify item exists and belongs to the claim
    const item = await prisma.item.findFirst({
      where: { id: itemId, claimId },
      include: { attachments: true },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json(item.attachments);
  } catch (error) {
    console.error("Failed to fetch attachments:", error);
    return NextResponse.json(
      { error: "Failed to fetch attachments" },
      { status: 500 }
    );
  }
}
