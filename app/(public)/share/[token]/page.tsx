'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Reorder, AnimatePresence, LayoutGroup } from 'framer-motion'
import { ItemCard } from '@/_barron-agency/components/ItemCard'
import { ClaimDetailsCard, type ClaimDetailsData } from '@/_barron-agency/components/ClaimDetailsCard'
import { EmptyState } from '@/_barron-agency/components/EmptyState'
import { Card, CardContent } from '@/_barron-agency/components/Card'
import { Skeleton } from '@/_barron-agency/components/Skeleton'
import { TopBar } from '@/_barron-agency/components/TopBar'
import type { Claim, Item, Attachment } from '@prisma/client'

// Types for shared claim data
interface SharedClaimData {
  claim: Claim & {
    items: (Item & {
      attachments: Attachment[]
    })[]
  }
  shareLink: {
    id: string
    token: string
    createdAt: Date
  }
}

// Fetch shared claim by token
function useSharedClaim(token: string) {
  return useQuery({
    queryKey: ['sharedClaim', token],
    queryFn: async (): Promise<SharedClaimData> => {
      const response = await fetch(`/api/share/${token}`)
      if (!response.ok) {
        throw new Error('Shared claim not found or has been revoked')
      }
      return response.json()
    },
    enabled: !!token,
  })
}

export default function SharedClaimPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = React.use(params)
  const { data, isLoading, error } = useSharedClaim(token)

  // Transform items for display
  const displayItems = useMemo(() => {
    if (!data?.claim?.items) return []
    return data.claim.items
  }, [data?.claim?.items])

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="p-8 space-y-6">
          <EmptyState
            title="Shared Link Not Found"
            description="This shared link may have been revoked or does not exist."
          />
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="p-8 space-y-6">
          <Skeleton className="h-10 w-1/2" />
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    )
  }

  const claim = data?.claim

  return (
    <div className="min-h-screen bg-background">
      <TopBar disableBrandLink />
      <div className="px-8 pt-24 pb-8 space-y-6">
        {/* Claim Info Card */}
        {claim && (
          <ClaimDetailsCard
            claim={{
              claimNumber: claim.claimNumber,
              status: claim.status,
              customer: claim.customer,
              adjustorName: claim.adjustorName,
              adjustorPhone: claim.adjustorPhone,
              adjustorEmail: claim.adjustorEmail,
              claimantName: claim.claimantName,
              claimantPhone: claim.claimantPhone,
              claimantEmail: claim.claimantEmail,
              claimantAddress: claim.claimantAddress,
            }}
            readOnly={true}
            hideStatus={true}
          />
        )}

        {/* Items Section */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {displayItems.length} {displayItems.length === 1 ? 'item' : 'items'}
          </div>
        </div>

        {/* Items List - read-only */}
        <div className="flex flex-col gap-4 w-full">
          {displayItems.length === 0 ? (
            <EmptyState
              title="No items"
              description="This claim has no items."
            />
          ) : (
            <LayoutGroup>
              <AnimatePresence mode="popLayout">
                <div className="flex flex-col gap-4 w-full">
                  {displayItems.map((item) => {
                    // Transform attachments for ItemCard
                    const attachments = item.attachments.map((a) => ({
                      id: a.id,
                      name: a.filename,
                      url: a.url,
                      thumbnailUrl: a.thumbnailUrl,
                      type: a.mimeType,
                      size: a.size,
                      width: a.width,
                      height: a.height,
                      publicId: a.publicId,
                      format: a.format,
                    }))

                    return (
                      <ItemCard
                        key={item.id}
                        itemId={item.id}
                        title={item.title}
                        description={item.description}
                        editable={false}
                        readOnly={true}
                        attachments={attachments}
                      />
                    )
                  })}
                </div>
              </AnimatePresence>
            </LayoutGroup>
          )}
        </div>
      </div>
    </div>
  )
}
