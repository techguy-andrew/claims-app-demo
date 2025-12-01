'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Types for share link
export interface ShareLink {
  id: string
  token: string
  claimId: string
  createdAt: Date
}

// Fetch share link for a claim
export function useShareLink(claimId: string | undefined) {
  return useQuery({
    queryKey: ['shareLink', claimId],
    queryFn: async (): Promise<ShareLink | null> => {
      const response = await fetch(`/api/claims/${claimId}/share`)
      if (response.status === 404) {
        return null
      }
      if (!response.ok) {
        throw new Error('Failed to fetch share link')
      }
      return response.json()
    },
    enabled: !!claimId,
  })
}

// Create or get existing share link
export function useCreateShareLink() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (claimId: string): Promise<ShareLink> => {
      const response = await fetch(`/api/claims/${claimId}/share`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create share link')
      }

      return response.json()
    },

    onSuccess: (shareLink, claimId) => {
      // Update cache with new share link
      queryClient.setQueryData(['shareLink', claimId], shareLink)
    },
  })
}

// Revoke (delete) share link
export function useRevokeShareLink() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (claimId: string): Promise<void> => {
      const response = await fetch(`/api/claims/${claimId}/share`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to revoke share link')
      }
    },

    onMutate: async (claimId) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['shareLink', claimId] })

      // Snapshot previous value
      const previousShareLink = queryClient.getQueryData<ShareLink>(['shareLink', claimId])

      // Optimistically remove
      queryClient.setQueryData(['shareLink', claimId], null)

      return { previousShareLink }
    },

    onError: (err, claimId, context) => {
      // Rollback on error
      if (context?.previousShareLink) {
        queryClient.setQueryData(['shareLink', claimId], context.previousShareLink)
      }
    },
  })
}

// Build share URL from token
export function buildShareUrl(token: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/share/${token}`
  }
  // Fallback for SSR
  return `/share/${token}`
}
