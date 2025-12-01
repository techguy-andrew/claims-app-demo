'use client'

import React, { useState } from 'react'
import { Button } from './Button'
import { DownloadIcon } from '../icons/DownloadIcon'
import { SpinnerIcon } from '../icons/SpinnerIcon'
import { toast } from './Toast'
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Inline utility for merging Tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface DownloadClaimPDFProps {
  /** The claim ID to download */
  claimId: string
  /** The claim number for the filename */
  claimNumber: string
  /** Optional additional class names */
  className?: string
}

export function DownloadClaimPDF({
  claimId,
  claimNumber,
  className,
}: DownloadClaimPDFProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleDownload = async () => {
    setIsLoading(true)

    try {
      const response = await fetch(`/api/claims/${claimId}/pdf`)

      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }

      // Get blob from response
      const blob = await response.blob()

      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Claim-${claimNumber}.pdf`

      // Trigger download
      document.body.appendChild(link)
      link.click()

      // Cleanup
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('PDF downloaded successfully')
    } catch (error) {
      console.error('PDF download error:', error)
      toast.error('Failed to download PDF')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handleDownload}
      disabled={isLoading}
      className={cn('gap-2', className)}
    >
      {isLoading ? (
        <SpinnerIcon className="h-4 w-4 animate-spin" />
      ) : (
        <DownloadIcon className="h-4 w-4" />
      )}
      {isLoading ? 'Generating...' : 'Download PDF'}
    </Button>
  )
}
