'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Claim, Item, Attachment } from '@prisma/client'
import { ClaimStatus } from '@prisma/client'

// Types for API responses
export interface ClaimWithCount extends Claim {
  claimant: {
    id: string
    name: string | null
    email: string
  }
  _count: {
    items: number
  }
}

// Input type for creating a claim
export interface CreateClaimInput {
  claimNumber: string
  customer?: string
  adjustorName?: string
  adjustorPhone?: string
  adjustorEmail?: string
  claimantName?: string
  claimantPhone?: string
  claimantEmail?: string
  claimantAddress?: string
}

export interface ClaimWithItems extends Claim {
  claimant: {
    id: string
    name: string | null
    email: string
  }
  items: (Item & {
    attachments: Attachment[]
  })[]
}

// Fetch all claims
export function useClaims() {
  return useQuery({
    queryKey: ['claims'],
    queryFn: async (): Promise<ClaimWithCount[]> => {
      const response = await fetch('/api/claims')
      if (!response.ok) {
        throw new Error('Failed to fetch claims')
      }
      return response.json()
    },
  })
}

// Fetch single claim with items
export function useClaim(claimId: string | undefined) {
  return useQuery({
    queryKey: ['claims', claimId],
    queryFn: async (): Promise<ClaimWithItems> => {
      const response = await fetch(`/api/claims/${claimId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch claim')
      }
      return response.json()
    },
    enabled: !!claimId,
  })
}

// Re-export the ClaimStatus enum for convenience
export { ClaimStatus }

// Input type for updating a claim
export interface UpdateClaimInput {
  id: string
  claimNumber?: string
  customer?: string | null
  status?: ClaimStatus
  adjustorName?: string | null
  adjustorPhone?: string | null
  adjustorEmail?: string | null
  claimantName?: string | null
  claimantPhone?: string | null
  claimantEmail?: string | null
  claimantAddress?: string | null
}

// Create Claim Mutation with Optimistic Update
export function useCreateClaim() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateClaimInput): Promise<ClaimWithCount> => {
      const response = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create claim')
      }

      return response.json()
    },

    onMutate: async (data) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['claims'] })

      // Snapshot previous value
      const previousClaims = queryClient.getQueryData<ClaimWithCount[]>(['claims'])

      // Optimistically update with temporary claim
      const tempClaim: ClaimWithCount = {
        id: `temp-${Date.now()}`,
        description: null,
        amount: null,
        status: ClaimStatus.PENDING,
        claimNumber: data.claimNumber,
        customer: data.customer || null,
        adjustorName: data.adjustorName || null,
        adjustorPhone: data.adjustorPhone || null,
        adjustorEmail: data.adjustorEmail || null,
        claimantName: data.claimantName || null,
        claimantPhone: data.claimantPhone || null,
        claimantEmail: data.claimantEmail || null,
        claimantAddress: data.claimantAddress || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        claimantId: 'temp',
        claimant: {
          id: 'temp',
          name: 'Loading...',
          email: '',
        },
        _count: {
          items: 0,
        },
      }

      queryClient.setQueryData<ClaimWithCount[]>(['claims'], (old) => {
        return [tempClaim, ...(old || [])]
      })

      return { previousClaims, tempClaim }
    },

    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousClaims) {
        queryClient.setQueryData(['claims'], context.previousClaims)
      }
    },

    onSuccess: (newClaim, variables, context) => {
      // Replace temp claim with real claim from server
      queryClient.setQueryData<ClaimWithCount[]>(['claims'], (old) => {
        if (!old) return [newClaim]
        return old.map((claim) =>
          claim.id === context?.tempClaim.id ? newClaim : claim
        )
      })
    },
  })
}

// Update Claim Mutation with Optimistic Update
export function useUpdateClaim() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdateClaimInput): Promise<ClaimWithItems> => {
      const response = await fetch(`/api/claims/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimNumber: data.claimNumber,
          customer: data.customer,
          status: data.status,
          adjustorName: data.adjustorName,
          adjustorPhone: data.adjustorPhone,
          adjustorEmail: data.adjustorEmail,
          claimantName: data.claimantName,
          claimantPhone: data.claimantPhone,
          claimantEmail: data.claimantEmail,
          claimantAddress: data.claimantAddress,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update claim')
      }

      return response.json()
    },

    onMutate: async (data) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['claims', data.id] })

      // Snapshot previous value
      const previousClaim = queryClient.getQueryData<ClaimWithItems>(['claims', data.id])

      // Optimistically update
      queryClient.setQueryData<ClaimWithItems>(['claims', data.id], (old) => {
        if (!old) return old
        return {
          ...old,
          claimNumber: data.claimNumber ?? old.claimNumber,
          customer: data.customer ?? old.customer,
          status: data.status ?? old.status,
          adjustorName: data.adjustorName ?? old.adjustorName,
          adjustorPhone: data.adjustorPhone ?? old.adjustorPhone,
          adjustorEmail: data.adjustorEmail ?? old.adjustorEmail,
          claimantName: data.claimantName ?? old.claimantName,
          claimantPhone: data.claimantPhone ?? old.claimantPhone,
          claimantEmail: data.claimantEmail ?? old.claimantEmail,
          claimantAddress: data.claimantAddress ?? old.claimantAddress,
        }
      })

      return { previousClaim }
    },

    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousClaim) {
        queryClient.setQueryData(['claims', variables.id], context.previousClaim)
      }
    },

    onSuccess: (updatedClaim) => {
      // Also update the claims list if it exists
      queryClient.setQueryData<ClaimWithCount[]>(['claims'], (old) => {
        if (!old) return old
        return old.map((claim) =>
          claim.id === updatedClaim.id
            ? {
                ...claim,
                claimNumber: updatedClaim.claimNumber,
                customer: updatedClaim.customer,
                status: updatedClaim.status,
                adjustorName: updatedClaim.adjustorName,
                adjustorPhone: updatedClaim.adjustorPhone,
                adjustorEmail: updatedClaim.adjustorEmail,
                claimantName: updatedClaim.claimantName,
                claimantPhone: updatedClaim.claimantPhone,
                claimantEmail: updatedClaim.claimantEmail,
                claimantAddress: updatedClaim.claimantAddress,
              }
            : claim
        )
      })
    },
  })
}

// Delete Claim Mutation with Optimistic Update
export function useDeleteClaim() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id }: { id: string }): Promise<void> => {
      const response = await fetch(`/api/claims/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete claim')
      }
    },

    onMutate: async ({ id }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['claims'] })
      await queryClient.cancelQueries({ queryKey: ['claims', id] })

      // Snapshot previous values
      const previousClaims = queryClient.getQueryData<ClaimWithCount[]>(['claims'])
      const previousClaim = queryClient.getQueryData<ClaimWithItems>(['claims', id])

      // Optimistically remove from list
      queryClient.setQueryData<ClaimWithCount[]>(['claims'], (old) => {
        if (!old) return old
        return old.filter((claim) => claim.id !== id)
      })

      // Remove the individual claim cache
      queryClient.removeQueries({ queryKey: ['claims', id] })

      return { previousClaims, previousClaim }
    },

    onError: (err, { id }, context) => {
      // Rollback on error
      if (context?.previousClaims) {
        queryClient.setQueryData(['claims'], context.previousClaims)
      }
      if (context?.previousClaim) {
        queryClient.setQueryData(['claims', id], context.previousClaim)
      }
    },
  })
}
