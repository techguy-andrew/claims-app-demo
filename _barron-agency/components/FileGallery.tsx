"use client"

import React, { useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { useDropzone } from "react-dropzone"
import { CancelIcon } from "../icons/CancelIcon"
import { DownloadIcon } from "../icons/DownloadIcon"
import { UploadIcon } from "../icons/UploadIcon"
import { SpinnerIcon } from "../icons/SpinnerIcon"
import { Button } from "./Button"

// Dynamic imports to avoid SSR issues with pdf.js (uses browser APIs like DOMMatrix)
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

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./Dialog"
import { ConfirmationDialog } from "./ConfirmationDialog"
import type { Attachment } from "../types"
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Inline utility for merging Tailwind classes - makes component portable
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// File type info for styled placeholders
function getFileTypeInfo(filename: string): { label: string; color: string; extension: string } {
  const ext = filename.split('.').pop()?.toLowerCase() || 'file'

  const typeMap: Record<string, { label: string; color: string }> = {
    // PDF
    'pdf': { label: 'PDF', color: 'bg-red-600' },
    // Videos
    'mp4': { label: 'VIDEO', color: 'bg-violet-500' },
    'mov': { label: 'VIDEO', color: 'bg-violet-500' },
    'webm': { label: 'VIDEO', color: 'bg-violet-500' },
    'avi': { label: 'VIDEO', color: 'bg-violet-500' },
    'mkv': { label: 'VIDEO', color: 'bg-violet-500' },
    // Documents
    'doc': { label: 'DOC', color: 'bg-blue-500' },
    'docx': { label: 'DOC', color: 'bg-blue-500' },
    'txt': { label: 'TXT', color: 'bg-slate-500' },
    'rtf': { label: 'RTF', color: 'bg-blue-400' },
    // Spreadsheets
    'xls': { label: 'XLS', color: 'bg-green-600' },
    'xlsx': { label: 'XLS', color: 'bg-green-600' },
    'csv': { label: 'CSV', color: 'bg-green-500' },
    // Presentations
    'ppt': { label: 'PPT', color: 'bg-orange-500' },
    'pptx': { label: 'PPT', color: 'bg-orange-500' },
    // Archives
    'zip': { label: 'ZIP', color: 'bg-amber-600' },
    'rar': { label: 'RAR', color: 'bg-amber-600' },
    '7z': { label: '7Z', color: 'bg-amber-600' },
    // Code/Data
    'json': { label: 'JSON', color: 'bg-purple-500' },
    'xml': { label: 'XML', color: 'bg-purple-400' },
    'html': { label: 'HTML', color: 'bg-red-500' },
    // Audio
    'mp3': { label: 'MP3', color: 'bg-pink-500' },
    'wav': { label: 'WAV', color: 'bg-pink-500' },
    'm4a': { label: 'M4A', color: 'bg-pink-500' },
  }

  const info = typeMap[ext] || { label: ext.toUpperCase().slice(0, 4), color: 'bg-slate-400' }
  return { ...info, extension: ext.toUpperCase() }
}

interface FileGalleryProps {
  attachments?: Attachment[]
  onFilesAdded?: (files: File[]) => void
  onFileRemove?: (attachmentId: string) => void
  editable?: boolean
  maxFiles?: number
  /** Read-only mode - hides upload/delete but keeps view/download */
  readOnly?: boolean
}

export function FileGallery({
  attachments = [],
  onFilesAdded,
  onFileRemove,
  editable = true,
  maxFiles = 10,
  readOnly = false,
}: FileGalleryProps) {
  const [selectedFile, setSelectedFile] = useState<Attachment | null>(null)
  const [fileToDelete, setFileToDelete] = useState<Attachment | null>(null)

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (onFilesAdded) {
        onFilesAdded(acceptedFiles)
      }
    },
    [onFilesAdded]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: maxFiles - attachments.length,
    disabled: !editable || readOnly || attachments.length >= maxFiles,
  })

  const isImage = (type: string) => type.startsWith("image/")
  const isPdf = (type: string) => type === "application/pdf"
  const isVideo = (type: string) => type.startsWith("video/")

  const handleRemoveClick = (e: React.MouseEvent, attachment: Attachment) => {
    e.stopPropagation()
    setFileToDelete(attachment)
  }

  const handleConfirmDelete = () => {
    if (fileToDelete && onFileRemove) {
      onFileRemove(fileToDelete.id)
    }
    setFileToDelete(null)
  }

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
    <div className="w-full space-y-4">
      {/* Dropzone - hidden in readOnly mode */}
      {editable && !readOnly && attachments.length < maxFiles && (
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          )}
        >
          <input {...getInputProps()} />
          <UploadIcon className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            {isDragActive
              ? "Drop files here..."
              : "Drag and drop files here, or click to select"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {attachments.length}/{maxFiles} files uploaded
          </p>
        </div>
      )}

      {/* File Grid */}
      {attachments.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {attachments.map((attachment) => {
            const isUploading = attachment.id.startsWith('temp-')

            return (
              <div
                key={attachment.id}
                className="relative group cursor-pointer"
                onClick={() => !isUploading && setSelectedFile(attachment)}
              >
                <div className="aspect-square rounded-lg border bg-muted overflow-hidden">
                  {isImage(attachment.type) ? (
                    <img
                      src={attachment.thumbnailUrl || attachment.url}
                      alt={attachment.name}
                      className={cn(
                        "w-full h-full object-cover",
                        isUploading && "opacity-50"
                      )}
                      loading="lazy"
                    />
                  ) : (
                    (() => {
                      const fileInfo = getFileTypeInfo(attachment.name)
                      const isVideoFile = isVideo(attachment.type)
                      return (
                        <div className={cn(
                          "relative w-full h-full flex flex-col items-center justify-center p-3 bg-muted/50",
                          isUploading && "opacity-50"
                        )}>
                          <div className={cn(
                            "px-3 py-1.5 rounded-md text-white text-sm font-bold mb-2 shadow-sm",
                            fileInfo.color
                          )}>
                            {fileInfo.label}
                          </div>
                          <p className="text-xs text-muted-foreground text-center font-medium">
                            {isVideoFile ? 'Video' : isPdf(attachment.type) ? 'Document' : `${fileInfo.extension} File`}
                          </p>
                          <p className="text-[10px] text-muted-foreground/70 truncate w-full text-center mt-1 px-1">
                            {attachment.name}
                          </p>
                          {/* Play icon overlay for videos */}
                          {isVideoFile && !isUploading && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center shadow-md">
                                <svg className="w-5 h-5 text-foreground ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })()
                  )}

                  {/* Upload Progress Overlay */}
                  {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-foreground/40">
                      <div className="text-center">
                        <SpinnerIcon className="h-8 w-8 text-background mx-auto mb-2" />
                        <p className="text-xs text-background font-medium">Uploading...</p>
                      </div>
                    </div>
                  )}
                </div>

              {/* Remove button - disabled during upload or in readOnly mode */}
              {editable && !readOnly && onFileRemove && !isUploading && (
                <button
                  className="absolute top-2 right-2 p-0 m-0 border-0 bg-transparent cursor-pointer outline-none focus:outline-none text-destructive hover:text-destructive/80 hover:opacity-80 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => handleRemoveClick(e, attachment)}
                  aria-label="Remove file"
                >
                  <CancelIcon className="h-6 w-6" />
                </button>
              )}

              {/* File info overlay - hidden during upload */}
              {!isUploading && (
                <div className="absolute bottom-0 left-0 right-0 bg-foreground/60 text-background p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-xs truncate">{attachment.name}</p>
                  <p className="text-xs">
                    {(attachment.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              )}
            </div>
            )
          })}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
        <DialogContent className="max-w-4xl">
          {/* Download button - positioned next to close button */}
          <button
            className="absolute right-14 top-4 p-0 m-0 border-0 bg-transparent cursor-pointer outline-none focus:outline-none hover:opacity-80 transition-opacity"
            onClick={() => {
              if (selectedFile) {
                handleDownload(selectedFile)
              }
            }}
            aria-label="Download file"
          >
            <DownloadIcon className="h-8 w-8" />
          </button>
          <DialogHeader>
            <DialogTitle>{selectedFile?.name}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {selectedFile && isImage(selectedFile.type) ? (
              <img
                src={selectedFile.url}
                alt={selectedFile.name}
                className="w-full h-auto max-h-[70vh] object-contain"
              />
            ) : selectedFile && isPdf(selectedFile.type) ? (
              <div className="max-h-[70vh] overflow-auto">
                <PdfViewer url={selectedFile.url} maxWidth={700} />
              </div>
            ) : selectedFile && isVideo(selectedFile.type) ? (
              <video
                controls
                autoPlay
                className="w-full max-h-[70vh] rounded-lg"
                src={selectedFile.url}
              >
                <source src={selectedFile.url} type={selectedFile.type} />
                Your browser does not support the video tag.
              </video>
            ) : selectedFile ? (
              (() => {
                const fileInfo = getFileTypeInfo(selectedFile.name)
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
                    <p className="text-lg font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <Button
                      className="mt-4"
                      onClick={() => handleDownload(selectedFile)}
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

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={!!fileToDelete}
        onOpenChange={(open) => !open && setFileToDelete(null)}
        title="Delete File?"
        description={`Are you sure you want to delete "${fileToDelete?.name}"? This action cannot be undone.`}
        onConfirm={handleConfirmDelete}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDestructive={true}
      />
    </div>
  )
}
