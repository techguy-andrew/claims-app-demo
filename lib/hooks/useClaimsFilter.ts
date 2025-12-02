'use client'

import { useMemo } from 'react'
import type { ClaimWithCount } from './useClaims'
import type { ClaimStatus } from '@prisma/client'

export interface UseClaimsFilterOptions {
  claims: ClaimWithCount[] | undefined
  searchQuery: string
  selectedStatuses: ClaimStatus[]
}

export interface UseClaimsFilterResult {
  filteredClaims: ClaimWithCount[]
  isEmpty: boolean
  isFiltered: boolean
  activeFilterCount: number
}

export function useClaimsFilter({
  claims,
  searchQuery,
  selectedStatuses,
}: UseClaimsFilterOptions): UseClaimsFilterResult {
  const filteredClaims = useMemo(() => {
    if (!claims) return []

    return claims.filter((claim) => {
      // 1. Text search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const searchableFields = [
          claim.claimNumber,
          claim.claimantName,
          claim.customer,
          claim.adjustorName,
        ]
        const matchesSearch = searchableFields.some(
          (field) => field?.toLowerCase().includes(query)
        )
        if (!matchesSearch) return false
      }

      // 2. Status filter (multi-select: if any statuses selected, claim must match one)
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(claim.status)) {
        return false
      }

      return true
    })
  }, [claims, searchQuery, selectedStatuses])

  const isFiltered = Boolean(
    searchQuery.trim() ||
    selectedStatuses.length > 0
  )

  const activeFilterCount = [
    searchQuery.trim() ? 1 : 0,
    selectedStatuses.length > 0 ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  return {
    filteredClaims,
    isEmpty: filteredClaims.length === 0,
    isFiltered,
    activeFilterCount,
  }
}
