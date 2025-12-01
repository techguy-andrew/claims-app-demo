import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/share/[token] - Public: Fetch claim data by share token
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Find share link by token
    const shareLink = await prisma.shareLink.findUnique({
      where: { token },
      include: {
        claim: {
          include: {
            items: {
              orderBy: { order: 'asc' },
              include: {
                attachments: true,
              },
            },
          },
        },
      },
    })

    if (!shareLink) {
      return NextResponse.json(
        { error: 'Share link not found or has been revoked' },
        { status: 404 }
      )
    }

    // Return the claim data (without sensitive user info)
    return NextResponse.json({
      claim: shareLink.claim,
      shareLink: {
        id: shareLink.id,
        token: shareLink.token,
        createdAt: shareLink.createdAt,
      },
    })
  } catch (error) {
    console.error('Failed to fetch shared claim:', error)
    return NextResponse.json(
      { error: 'Failed to fetch shared claim' },
      { status: 500 }
    )
  }
}
