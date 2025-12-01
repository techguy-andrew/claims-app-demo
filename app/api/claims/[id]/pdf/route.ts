import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { prisma } from '@/lib/prisma'
import { ClaimPDF } from '@/_barron-agency/components/ClaimPDF'
import React from 'react'
import sharp from 'sharp'

// Helper to fetch image and convert to JPEG base64 data URI
// Uses sharp to convert any image format (WebP, HEIC, PNG, etc.) to JPEG
// because @react-pdf/renderer only supports JPEG and PNG
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000), // 15 second timeout
    })

    if (!response.ok) {
      console.warn('Failed to fetch image, status:', response.status, url)
      return null
    }

    const buffer = await response.arrayBuffer()

    if (buffer.byteLength === 0) {
      console.warn('Empty image data for:', url)
      return null
    }

    // Use sharp to convert any image format to JPEG
    try {
      const jpegBuffer = await sharp(Buffer.from(buffer))
        .rotate() // Auto-rotate based on EXIF orientation metadata
        .jpeg({ quality: 80 })
        .toBuffer()

      const base64 = jpegBuffer.toString('base64')
      console.log('Image converted to JPEG:', { url: url.substring(0, 60), originalSize: buffer.byteLength, jpegSize: jpegBuffer.length })
      return `data:image/jpeg;base64,${base64}`
    } catch (sharpError) {
      console.warn('Sharp failed to process image:', url, sharpError)
      return null
    }
  } catch (error) {
    console.warn('Failed to fetch image:', url, error)
    return null
  }
}

// GET /api/claims/[id]/pdf - Generate and download PDF
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Fetch claim with items and attachments
    const claim = await prisma.claim.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { order: 'asc' },
          include: {
            attachments: true,
          },
        },
      },
    })

    if (!claim) {
      return NextResponse.json(
        { error: 'Claim not found' },
        { status: 404 }
      )
    }

    // Get or create share link
    let shareLink = await prisma.shareLink.findUnique({
      where: { claimId: id },
    })

    if (!shareLink) {
      shareLink = await prisma.shareLink.create({
        data: { claimId: id },
      })
    }

    // Build share URL
    const host = request.headers.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const shareUrl = `${protocol}://${host}/share/${shareLink.token}`

    // Pre-fetch all images and convert to base64 to avoid hanging during PDF render
    const processedClaim = {
      ...claim,
      items: await Promise.all(
        claim.items.map(async (item) => ({
          ...item,
          attachments: await Promise.all(
            item.attachments.map(async (att) => {
              if (att.mimeType.startsWith('image/')) {
                const base64Url = await fetchImageAsBase64(att.url)
                return { ...att, base64Url }
              }
              return { ...att, base64Url: null }
            })
          ),
        }))
      ),
    }

    // Render PDF to buffer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfElement = React.createElement(ClaimPDF, { claim: processedClaim, shareUrl }) as any
    const buffer = await renderToBuffer(pdfElement)

    // Return PDF with download headers
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Claim-${claim.claimNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Failed to generate PDF:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}
