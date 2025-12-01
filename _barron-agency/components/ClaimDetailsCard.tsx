'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { MenuIcon } from '../icons/MenuIcon'
import { LoadingIcon } from '../icons/LoadingIcon'
import { SaveIcon } from '../icons/SaveIcon'
import { CancelIcon } from '../icons/CancelIcon'
import { ConfirmationDialog } from './ConfirmationDialog'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from './DropdownMenu'
import { ClaimStatusSelector } from './ClaimStatusSelector'
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { ClaimStatus } from '@prisma/client'

// Inline utility for merging Tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface ClaimDetailsData {
  claimNumber: string
  status: ClaimStatus
  customer: string | null
  adjustorName: string | null
  adjustorPhone: string | null
  adjustorEmail: string | null
  claimantName: string | null
  claimantPhone: string | null
  claimantEmail: string | null
  claimantAddress: string | null
}

export interface ClaimDetailsCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Claim details data */
  claim: ClaimDetailsData
  /** Callback when user saves edits */
  onSave?: (data: Partial<ClaimDetailsData>) => void
  /** Callback when user deletes the claim */
  onDelete?: () => void
  /** Visual indicator for background save operations */
  isSaving?: boolean
  /** Read-only mode - hides all edit/delete functionality */
  readOnly?: boolean
}

export function ClaimDetailsCard({
  claim,
  className,
  onSave,
  onDelete,
  isSaving = false,
  readOnly = false,
  ...props
}: ClaimDetailsCardProps) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = React.useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)

  // Editable field refs
  const claimNumberRef = React.useRef<HTMLSpanElement>(null)
  const customerRef = React.useRef<HTMLSpanElement>(null)
  const adjustorNameRef = React.useRef<HTMLSpanElement>(null)
  const adjustorPhoneRef = React.useRef<HTMLSpanElement>(null)
  const adjustorEmailRef = React.useRef<HTMLSpanElement>(null)
  const claimantNameRef = React.useRef<HTMLSpanElement>(null)
  const claimantPhoneRef = React.useRef<HTMLSpanElement>(null)
  const claimantEmailRef = React.useRef<HTMLSpanElement>(null)
  const claimantAddressRef = React.useRef<HTMLSpanElement>(null)

  // Original values for cancel/comparison
  const [originalValues, setOriginalValues] = React.useState({
    claimNumber: claim.claimNumber || '',
    customer: claim.customer || '',
    adjustorName: claim.adjustorName || '',
    adjustorPhone: claim.adjustorPhone || '',
    adjustorEmail: claim.adjustorEmail || '',
    claimantName: claim.claimantName || '',
    claimantPhone: claim.claimantPhone || '',
    claimantEmail: claim.claimantEmail || '',
    claimantAddress: claim.claimantAddress || '',
  })

  // Update original values when claim changes
  React.useEffect(() => {
    setOriginalValues({
      claimNumber: claim.claimNumber || '',
      customer: claim.customer || '',
      adjustorName: claim.adjustorName || '',
      adjustorPhone: claim.adjustorPhone || '',
      adjustorEmail: claim.adjustorEmail || '',
      claimantName: claim.claimantName || '',
      claimantPhone: claim.claimantPhone || '',
      claimantEmail: claim.claimantEmail || '',
      claimantAddress: claim.claimantAddress || '',
    })
  }, [claim])

  const handleEdit = () => {
    setIsEditing(true)
    setOriginalValues({
      claimNumber: claimNumberRef.current?.textContent || claim.claimNumber || '',
      customer: customerRef.current?.textContent || claim.customer || '',
      adjustorName: adjustorNameRef.current?.textContent || claim.adjustorName || '',
      adjustorPhone: adjustorPhoneRef.current?.textContent || claim.adjustorPhone || '',
      adjustorEmail: adjustorEmailRef.current?.textContent || claim.adjustorEmail || '',
      claimantName: claimantNameRef.current?.textContent || claim.claimantName || '',
      claimantPhone: claimantPhoneRef.current?.textContent || claim.claimantPhone || '',
      claimantEmail: claimantEmailRef.current?.textContent || claim.claimantEmail || '',
      claimantAddress: claimantAddressRef.current?.textContent || claim.claimantAddress || '',
    })
  }

  const getCurrentValues = () => ({
    claimNumber: claimNumberRef.current?.textContent || '',
    customer: customerRef.current?.textContent || '',
    adjustorName: adjustorNameRef.current?.textContent || '',
    adjustorPhone: adjustorPhoneRef.current?.textContent || '',
    adjustorEmail: adjustorEmailRef.current?.textContent || '',
    claimantName: claimantNameRef.current?.textContent || '',
    claimantPhone: claimantPhoneRef.current?.textContent || '',
    claimantEmail: claimantEmailRef.current?.textContent || '',
    claimantAddress: claimantAddressRef.current?.textContent || '',
  })

  const checkForChanges = () => {
    const current = getCurrentValues()
    return (
      current.claimNumber !== originalValues.claimNumber ||
      current.customer !== originalValues.customer ||
      current.adjustorName !== originalValues.adjustorName ||
      current.adjustorPhone !== originalValues.adjustorPhone ||
      current.adjustorEmail !== originalValues.adjustorEmail ||
      current.claimantName !== originalValues.claimantName ||
      current.claimantPhone !== originalValues.claimantPhone ||
      current.claimantEmail !== originalValues.claimantEmail ||
      current.claimantAddress !== originalValues.claimantAddress
    )
  }

  const handleSave = () => {
    const current = getCurrentValues()
    onSave?.({
      claimNumber: current.claimNumber || '',
      customer: current.customer || null,
      adjustorName: current.adjustorName || null,
      adjustorPhone: current.adjustorPhone || null,
      adjustorEmail: current.adjustorEmail || null,
      claimantName: current.claimantName || null,
      claimantPhone: current.claimantPhone || null,
      claimantEmail: current.claimantEmail || null,
      claimantAddress: current.claimantAddress || null,
    })
    setIsEditing(false)
  }

  const handleCancel = () => {
    if (checkForChanges()) {
      setShowCancelConfirm(true)
      return
    }
    performCancel()
  }

  const performCancel = () => {
    // Restore original values
    if (claimNumberRef.current) claimNumberRef.current.textContent = originalValues.claimNumber || ''
    if (customerRef.current) customerRef.current.textContent = originalValues.customer || ''
    if (adjustorNameRef.current) adjustorNameRef.current.textContent = originalValues.adjustorName || ''
    if (adjustorPhoneRef.current) adjustorPhoneRef.current.textContent = originalValues.adjustorPhone || ''
    if (adjustorEmailRef.current) adjustorEmailRef.current.textContent = originalValues.adjustorEmail || ''
    if (claimantNameRef.current) claimantNameRef.current.textContent = originalValues.claimantName || ''
    if (claimantPhoneRef.current) claimantPhoneRef.current.textContent = originalValues.claimantPhone || ''
    if (claimantEmailRef.current) claimantEmailRef.current.textContent = originalValues.claimantEmail || ''
    if (claimantAddressRef.current) claimantAddressRef.current.textContent = originalValues.claimantAddress || ''
    setIsEditing(false)
  }

  const handleConfirmCancel = () => {
    setShowCancelConfirm(false)
    performCancel()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (isEditing) {
        handleSave()
      }
    }
    if (e.key === 'Escape' && isEditing) {
      e.preventDefault()
      handleCancel()
    }
  }

  // Editable field component
  const EditableField = ({
    label,
    value,
    fieldRef,
    placeholder = 'N/A',
  }: {
    label: string
    value: string | null
    fieldRef: React.RefObject<HTMLSpanElement | null>
    placeholder?: string
  }) => (
    <div className="flex items-baseline gap-2">
      <span className="text-muted-foreground min-w-[80px]">{label}:</span>
      <span
        ref={fieldRef}
        contentEditable={isEditing}
        suppressContentEditableWarning
        onKeyDown={handleKeyDown}
        data-placeholder={isEditing ? placeholder : undefined}
        className={cn(
          "outline-none flex-1",
          isEditing ? "cursor-text" : "select-text",
          isEditing && "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50",
          !value && !isEditing && "text-muted-foreground italic"
        )}
      >
        {value || (isEditing ? '' : 'N/A')}
      </span>
    </div>
  )

  return (
    <div
      className={cn(
        'rounded-lg border bg-card text-card-foreground shadow-sm w-full transition-shadow',
        className
      )}
      onDoubleClick={() => !isEditing && !readOnly && handleEdit()}
      {...props}
    >
      {/* Card Header */}
      <div className="p-6 relative">
        {/* Menu button - absolutely positioned in top right corner (hidden in readOnly mode) */}
        {!readOnly && (
        <div className="absolute top-4 right-4 w-[150px] flex justify-end">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <button
                className="p-0 m-0 border-0 bg-transparent cursor-pointer outline-none focus:outline-none text-success hover:text-success/80 hover:opacity-80 transition-opacity"
                onClick={handleSave}
                aria-label="Save changes"
              >
                <SaveIcon className="h-8 w-8" />
              </button>

              <button
                className="p-0 m-0 border-0 bg-transparent cursor-pointer outline-none focus:outline-none text-destructive hover:text-destructive/80 hover:opacity-80 transition-opacity"
                onClick={handleCancel}
                aria-label="Cancel changes"
              >
                <CancelIcon className="h-8 w-8" />
              </button>
            </div>
          ) : (
            isSaving ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: "linear"
                }}
              >
                <LoadingIcon className="h-8 w-8" />
              </motion.div>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="p-0 m-0 border-0 bg-transparent cursor-pointer outline-none focus:outline-none hover:opacity-80 transition-opacity"
                    aria-label="More options"
                  >
                    <MenuIcon className="h-8 w-8" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleEdit}>
                    Edit
                  </DropdownMenuItem>
                  {onDelete && (
                    <DropdownMenuItem
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-destructive"
                    >
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )
          )}
        </div>
        )}

        {/* Content */}
        <div className="space-y-4 pr-16">
          {/* Status Row */}
          <div className="flex flex-wrap items-center gap-4">
            <ClaimStatusSelector
              status={claim.status}
              onStatusChange={(status) => onSave?.({ status })}
              disabled={isSaving || readOnly}
            />
          </div>

          {/* Claim Number */}
          <div className="text-sm">
            <EditableField
              label="Claim #"
              value={claim.claimNumber}
              fieldRef={claimNumberRef}
              placeholder="Enter claim number"
            />
          </div>

          {/* Customer */}
          <div className="text-sm">
            <EditableField
              label="Customer"
              value={claim.customer}
              fieldRef={customerRef}
              placeholder="Enter customer name"
            />
          </div>

          {/* Adjustor Info */}
          <div className="pt-4 border-t space-y-2 text-sm">
            <p className="font-medium">Adjustor</p>
            <EditableField
              label="Name"
              value={claim.adjustorName}
              fieldRef={adjustorNameRef}
              placeholder="Enter adjustor name"
            />
            <EditableField
              label="Phone"
              value={claim.adjustorPhone}
              fieldRef={adjustorPhoneRef}
              placeholder="Enter phone number"
            />
            <EditableField
              label="Email"
              value={claim.adjustorEmail}
              fieldRef={adjustorEmailRef}
              placeholder="Enter email address"
            />
          </div>

          {/* Claimant Info */}
          <div className="pt-4 border-t space-y-2 text-sm">
            <p className="font-medium">Claimant</p>
            <EditableField
              label="Name"
              value={claim.claimantName}
              fieldRef={claimantNameRef}
              placeholder="Enter claimant name"
            />
            <EditableField
              label="Phone"
              value={claim.claimantPhone}
              fieldRef={claimantPhoneRef}
              placeholder="Enter phone number"
            />
            <EditableField
              label="Email"
              value={claim.claimantEmail}
              fieldRef={claimantEmailRef}
              placeholder="Enter email address"
            />
            <EditableField
              label="Address"
              value={claim.claimantAddress}
              fieldRef={claimantAddressRef}
              placeholder="Enter address"
            />
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <ConfirmationDialog
        open={showCancelConfirm}
        onOpenChange={setShowCancelConfirm}
        title="Discard Changes?"
        description="You have unsaved changes that will be lost. Are you sure you want to discard them?"
        onConfirm={handleConfirmCancel}
        confirmLabel="Discard"
        cancelLabel="Keep Editing"
        isDestructive={true}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Claim?"
        description="This will permanently delete this claim and all associated items. This action cannot be undone."
        onConfirm={() => {
          setShowDeleteConfirm(false)
          onDelete?.()
        }}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDestructive={true}
        confirmationText="delete this claim"
      />
    </div>
  )
}
