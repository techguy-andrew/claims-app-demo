import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/claims/[id] - Get single claim with items and attachments
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const claim = await prisma.claim.findUnique({
      where: { id },
      include: {
        claimant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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

    return NextResponse.json(claim)
  } catch (error) {
    console.error('Failed to fetch claim:', error)
    return NextResponse.json(
      { error: 'Failed to fetch claim' },
      { status: 500 }
    )
  }
}

// PATCH /api/claims/[id] - Update claim details
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      claimNumber,
      customer,
      status,
      adjustorName,
      adjustorPhone,
      adjustorEmail,
      claimantName,
      claimantPhone,
      claimantEmail,
      claimantAddress,
    } = body

    const updateData: {
      claimNumber?: string
      customer?: string
      status?: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'CLOSED'
      adjustorName?: string
      adjustorPhone?: string
      adjustorEmail?: string
      claimantName?: string
      claimantPhone?: string
      claimantEmail?: string
      claimantAddress?: string
    } = {}

    if (claimNumber !== undefined) updateData.claimNumber = claimNumber
    if (customer !== undefined) updateData.customer = customer
    if (status !== undefined) updateData.status = status
    if (adjustorName !== undefined) updateData.adjustorName = adjustorName
    if (adjustorPhone !== undefined) updateData.adjustorPhone = adjustorPhone
    if (adjustorEmail !== undefined) updateData.adjustorEmail = adjustorEmail
    if (claimantName !== undefined) updateData.claimantName = claimantName
    if (claimantPhone !== undefined) updateData.claimantPhone = claimantPhone
    if (claimantEmail !== undefined) updateData.claimantEmail = claimantEmail
    if (claimantAddress !== undefined) updateData.claimantAddress = claimantAddress

    const claim = await prisma.claim.update({
      where: { id },
      data: updateData,
      include: {
        claimant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          orderBy: { order: 'asc' },
          include: {
            attachments: true,
          },
        },
      },
    })

    return NextResponse.json(claim)
  } catch (error) {
    console.error('Failed to update claim:', error)
    return NextResponse.json(
      { error: 'Failed to update claim' },
      { status: 500 }
    )
  }
}

// DELETE /api/claims/[id] - Delete claim and all associated items/attachments
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if claim exists
    const existingClaim = await prisma.claim.findUnique({
      where: { id },
    })

    if (!existingClaim) {
      return NextResponse.json(
        { error: 'Claim not found' },
        { status: 404 }
      )
    }

    // Delete the claim (Prisma cascade will handle items and attachments)
    await prisma.claim.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete claim:', error)
    return NextResponse.json(
      { error: 'Failed to delete claim' },
      { status: 500 }
    )
  }
}
