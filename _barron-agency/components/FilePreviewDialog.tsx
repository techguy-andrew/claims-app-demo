"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { DownloadIcon } from "../icons/DownloadIcon"
import { SpinnerIcon } from "../icons/SpinnerIcon"
import { Button } from "./Button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./Dialog"
import type { Attachment } from "../types"
import { cn, getFileTypeInfo } from "../utils/utils"

// Dynamic import to avoid SSR issues with pdf.js (uses browser APIs like DOMMatrix)
const PdfViewer = dynamic(
  () => import("./PdfViewer").then((mod) => ({ default: mod.PdfViewer })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        Loading PDF viewer...
      </div>
    ),
  }
)

interface FilePreviewDialogProps {
  file: Attachment | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FilePreviewDialog({ file, open, onOpenChange }: FilePreviewDialogProps) {
  const [isLoading, setIsLoading] = useState(true)

  const isImage = (type: string) => type.startsWith("image/")
  const isPdf = (type: string) => type === "application/pdf"
  const isVideo = (type: string) => type.startsWith("video/")

  // Reset loading state when file changes
  useEffect(() => {
    if (file) {
      // Only show loading for images and videos
      const needsLoading = isImage(file.type) || isVideo(file.type)
      setIsLoading(needsLoading)
    }
  }, [file])

  const handleDownload = async (attachment: Attachment) => {
    try {
      // Build query params with publicId for server-side signed URL generation
      const resourceType = attachment.type.startsWith('image/') ? 'image' : 'raw'
      const params = new URLSearchParams({
        publicId: attachment.publicId,
        resourceType,
        filename: attachment.name,
      })
      if (attachment.format) params.set('format', attachment.format)

      const response = await fetch(`/api/download?${params}`)
      if (!response.ok) {
        throw new Error('Download failed')
      }

      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = attachment.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error('Download error:', error)
      // Fallback to opening in new tab if download fails
      window.open(attachment.url, '_blank')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        {/* Download button - positioned next to close button */}
        <button
          className="absolute right-14 top-4 p-0 m-0 border-0 bg-transparent cursor-pointer outline-none focus:outline-none hover:opacity-80 transition-opacity"
          onClick={() => {
            if (file) {
              handleDownload(file)
            }
          }}
          aria-label="Download file"
        >
          <DownloadIcon className="h-8 w-8" />
        </button>
        <DialogHeader>
          <DialogTitle>{file?.name}</DialogTitle>
        </DialogHeader>
        <div className="mt-4 relative">
          {/* Loading Spinner Overlay */}
          {isLoading && (file && (isImage(file.type) || isVideo(file.type))) && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
              <SpinnerIcon className="h-12 w-12 text-primary" />
            </div>
          )}

          {file && isImage(file.type) ? (
            <img
              src={file.url}
              alt={file.name}
              className="w-full h-auto max-h-[70vh] object-contain"
              onLoad={() => setIsLoading(false)}
            />
          ) : file && isPdf(file.type) ? (
            <div className="max-h-[70vh] overflow-auto">
              <PdfViewer url={file.url} maxWidth={700} />
            </div>
          ) : file && isVideo(file.type) ? (
            <video
              controls
              autoPlay
              className="w-full max-h-[70vh] rounded-lg"
              src={file.url}
              onLoadedData={() => setIsLoading(false)}
            >
              <source src={file.url} type={file.type} />
              Your browser does not support the video tag.
            </video>
          ) : file ? (
            (() => {
              const fileInfo = getFileTypeInfo(file.name)
              return (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className={cn(
                    "px-6 py-3 rounded-lg text-white text-2xl font-bold mb-4 shadow-md",
                    fileInfo.color
                  )}>
                    {fileInfo.label}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {fileInfo.extension} Document
                  </p>
                  <p className="text-lg font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <Button
                    className="mt-4"
                    onClick={() => handleDownload(file)}
                  >
                    Download File
                  </Button>
                </div>
              )
            })()
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
