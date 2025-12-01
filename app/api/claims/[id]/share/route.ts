import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/claims/[id]/share - Create or get existing share link
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if claim exists
    const claim = await prisma.claim.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!claim) {
      return NextResponse.json(
        { error: 'Claim not found' },
        { status: 404 }
      )
    }

    // Check if share link already exists for this claim
    const existingLink = await prisma.shareLink.findUnique({
      where: { claimId: id },
    })

    if (existingLink) {
      return NextResponse.json(existingLink)
    }

    // Create new share link
    const shareLink = await prisma.shareLink.create({
      data: {
        claimId: id,
      },
    })

    return NextResponse.json(shareLink, { status: 201 })
  } catch (error) {
    console.error('Failed to create share link:', error)
    return NextResponse.json(
      { error: 'Failed to create share link' },
      { status: 500 }
    )
  }
}

// GET /api/claims/[id]/share - Get share link for a claim
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const shareLink = await prisma.shareLink.findUnique({
      where: { claimId: id },
    })

    if (!shareLink) {
      return NextResponse.json(
        { error: 'Share link not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(shareLink)
  } catch (error) {
    console.error('Failed to fetch share link:', error)
    return NextResponse.json(
      { error: 'Failed to fetch share link' },
      { status: 500 }
    )
  }
}

// DELETE /api/claims/[id]/share - Revoke (delete) share link
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const shareLink = await prisma.shareLink.findUnique({
      where: { claimId: id },
    })

    if (!shareLink) {
      return NextResponse.json(
        { error: 'Share link not found' },
        { status: 404 }
      )
    }

    await prisma.shareLink.delete({
      where: { claimId: id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to revoke share link:', error)
    return NextResponse.json(
      { error: 'Failed to revoke share link' },
      { status: 500 }
    )
  }
}
