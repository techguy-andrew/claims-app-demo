'use client'

import { useState, useCallback } from 'react'
import { PageHeader } from '@/_barron-agency/components/PageHeader'
import { EmptyState } from '@/_barron-agency/components/EmptyState'
import { Button } from '@/_barron-agency/components/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/_barron-agency/components/Dialog'
import { ConfirmationDialog } from '@/_barron-agency/components/ConfirmationDialog'
import { ClaimForm, type ClaimFormData } from '@/_barron-agency/components/ClaimForm'
import { ClaimListCard, ClaimListCardSkeleton } from '@/_barron-agency/components/ClaimListCard'
import { ClaimsToolbar } from '@/_barron-agency/components/ClaimsToolbar'
import { PlusIcon } from '@/_barron-agency/icons/PlusIcon'
import { useClaims, useCreateClaim, ClaimStatus } from '@/lib/hooks/useClaims'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { useClaimsFilter } from '@/lib/hooks/useClaimsFilter'

export default function ClaimsPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [isFormDirty, setIsFormDirty] = useState(false)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState<ClaimStatus[]>([])

  // Debounced search for performance
  const debouncedSearch = useDebounce(searchQuery, 300)

  const { data: claims, isLoading, error } = useClaims()
  const createClaim = useCreateClaim()

  // Filtered results
  const { filteredClaims, isEmpty, isFiltered, activeFilterCount } = useClaimsFilter({
    claims,
    searchQuery: debouncedSearch,
    selectedStatuses,
  })

  const clearAllFilters = useCallback(() => {
    setSearchQuery('')
    setSelectedStatuses([])
  }, [])

  const handleCreateClaim = (data: ClaimFormData) => {
    createClaim.mutate(data, {
      onSuccess: () => {
        setIsFormDirty(false)
        setDialogOpen(false)
      },
    })
  }

  const handleDialogClose = useCallback((open: boolean) => {
    if (!open && isFormDirty) {
      // User is trying to close with unsaved changes
      setConfirmDialogOpen(true)
    } else {
      setDialogOpen(open)
      if (!open) {
        setIsFormDirty(false)
      }
    }
  }, [isFormDirty])

  const handleConfirmDiscard = useCallback(() => {
    setIsFormDirty(false)
    setDialogOpen(false)
    setConfirmDialogOpen(false)
  }, [])

  const handleCancelForm = useCallback(() => {
    if (isFormDirty) {
      setConfirmDialogOpen(true)
    } else {
      setDialogOpen(false)
    }
  }, [isFormDirty])

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-16 z-40 bg-background border-b px-8 py-6">
          <PageHeader title="Claims" />
        </div>
        <div className="p-8">
          <EmptyState
            title="Error loading claims"
            description="There was a problem loading your claims. Please try again."
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <ClaimsToolbar
          title="Claims"
          description="View and manage all insurance claims"
          action={
            <Button onClick={() => setDialogOpen(true)}>
              <PlusIcon />
              New Claim
            </Button>
          }
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedStatuses={selectedStatuses}
          onStatusChange={setSelectedStatuses}
          onClearAll={clearAllFilters}
          activeFilterCount={activeFilterCount}
        />

        <div className="p-8">
          {isLoading ? (
            <div className="flex flex-col gap-4">
              {[...Array(3)].map((_, i) => (
                <ClaimListCardSkeleton key={i} />
              ))}
            </div>
          ) : isEmpty ? (
            <EmptyState
              title={isFiltered ? "No matching claims" : "No claims yet"}
              description={
                isFiltered
                  ? "Try adjusting your search or filter criteria."
                  : "Claims will appear here once they are created."
              }
            />
          ) : (
            <div className="flex flex-col gap-4">
              {filteredClaims.map((claim) => (
                <ClaimListCard
                  key={claim.id}
                  id={claim.id}
                  claimNumber={claim.claimNumber}
                  status={claim.status}
                  claimantName={claim.claimantName}
                  itemCount={claim._count.items}
                  createdAt={claim.createdAt}
                  href={`/claims/${claim.id}`}
                />
              ))}
            </div>
          )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Claim</DialogTitle>
              <DialogDescription>
                Create a new insurance claim
              </DialogDescription>
            </DialogHeader>
            <ClaimForm
              onFormSubmit={handleCreateClaim}
              onCancel={handleCancelForm}
              isSubmitting={createClaim.isPending}
              onDirtyChange={setIsFormDirty}
            />
          </DialogContent>
        </Dialog>

        <ConfirmationDialog
          open={confirmDialogOpen}
          onOpenChange={setConfirmDialogOpen}
          title="Discard changes?"
          description="You have unsaved changes. Are you sure you want to close without saving?"
          onConfirm={handleConfirmDiscard}
          confirmLabel="Discard"
          cancelLabel="Keep Editing"
          isDestructive
        />
    </div>
  )
}
