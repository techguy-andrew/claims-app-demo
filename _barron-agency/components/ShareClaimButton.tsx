'use client'

import React, { useState } from 'react'
import { Button } from './Button'
import { ShareIcon } from '../icons/ShareIcon'
import { LinkIcon } from '../icons/LinkIcon'
import { SpinnerIcon } from '../icons/SpinnerIcon'
import { CancelIcon } from '../icons/CancelIcon'
import { toast } from './Toast'
import { useShareLink, useCreateShareLink, useRevokeShareLink, buildShareUrl } from '@/lib/hooks/useShareLinks'
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Inline utility for merging Tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Fallback clipboard function that works after async operations
// (navigator.clipboard.writeText can fail if user gesture timing expires)
async function copyToClipboard(text: string): Promise<void> {
  // Try modern API first
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      // Fall through to fallback
    }
  }

  // Fallback: create temporary textarea
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

interface ShareClaimButtonProps {
  /** The claim ID to share */
  claimId: string
  /** Optional additional class names */
  className?: string
}

export function ShareClaimButton({
  claimId,
  className,
}: ShareClaimButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  const { data: shareLink, isLoading: isLoadingLink } = useShareLink(claimId)
  const createShareLink = useCreateShareLink()
  const revokeShareLink = useRevokeShareLink()

  // Close menu on click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleCopyLink = async () => {
    try {
      let token = shareLink?.token

      // Create share link if it doesn't exist
      if (!token) {
        const newLink = await createShareLink.mutateAsync(claimId)
        token = newLink.token
      }

      const url = buildShareUrl(token)
      await copyToClipboard(url)
      toast.success('Share link copied to clipboard')
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to copy link:', error)
      toast.error('Failed to copy link')
    }
  }

  const handleRevokeLink = async () => {
    try {
      await revokeShareLink.mutateAsync(claimId)
      toast.success('Share link revoked')
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to revoke link:', error)
      toast.error('Failed to revoke link')
    }
  }

  const isLoading = createShareLink.isPending || revokeShareLink.isPending

  return (
    <div className="relative">
      <Button
        ref={triggerRef}
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={cn('gap-2', className)}
      >
        {isLoading ? (
          <SpinnerIcon className="h-4 w-4 animate-spin" />
        ) : (
          <ShareIcon className="h-4 w-4" />
        )}
        Share
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full mt-2 z-50 min-w-[200px] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {/* Copy Link */}
          <button
            className="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
            onClick={handleCopyLink}
            disabled={isLoading}
          >
            <LinkIcon className="h-4 w-4" />
            {shareLink ? 'Copy Link' : 'Generate & Copy Link'}
          </button>

          {/* Revoke Link (only if link exists) */}
          {shareLink && (
            <button
              className="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground text-destructive"
              onClick={handleRevokeLink}
              disabled={isLoading}
            >
              <CancelIcon className="h-4 w-4" />
              Revoke Link
            </button>
          )}

          {/* Link Info */}
          {shareLink && (
            <div className="px-3 py-2 text-xs text-muted-foreground border-t mt-1 pt-2">
              Link created: {new Date(shareLink.createdAt).toLocaleDateString()}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
