"use client";

import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure pdf.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  url: string;
  className?: string;
  maxWidth?: number;
}

export function PdfViewer({
  url,
  className = "",
  maxWidth = 600,
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reset page loading when changing pages
  useEffect(() => {
    setPageLoading(true);
  }, [pageNumber]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setIsLoading(false);
    setError(null);
  }

  function onDocumentLoadError(err: Error) {
    setError("Failed to load PDF");
    setIsLoading(false);
    setPageLoading(false);
    console.error("PDF load error:", err);
  }

  function onPageRenderSuccess() {
    setPageLoading(false);
  }

  function goToPreviousPage() {
    setPageNumber((prev) => Math.max(1, prev - 1));
  }

  function goToNextPage() {
    if (numPages) {
      setPageNumber((prev) => Math.min(numPages, prev + 1));
    }
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* PDF Document */}
      <div className="relative border border-gray-200 rounded-lg overflow-hidden bg-gray-100">
        {/* Loading overlay */}
        {(isLoading || pageLoading) && !error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-100/90 backdrop-blur-sm transition-opacity duration-300">
            <div className="flex flex-col items-center gap-3">
              <svg
                className="animate-spin h-8 w-8 text-gray-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="text-sm text-gray-500">Loading PDF...</span>
            </div>
          </div>
        )}
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={null}
          error={
            <div className="flex items-center justify-center p-8 text-red-500">
              <svg
                className="h-6 w-6 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              {error || "Failed to load PDF"}
            </div>
          }
        >
          <Page
            pageNumber={pageNumber}
            width={maxWidth}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            onRenderSuccess={onPageRenderSuccess}
          />
        </Document>
      </div>

      {/* Pagination Controls */}
      {numPages && numPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-4">
          <button
            onClick={goToPreviousPage}
            disabled={pageNumber <= 1}
            className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous page"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <span className="text-sm text-gray-600">
            Page {pageNumber} of {numPages}
          </span>

          <button
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
            className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Next page"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Page info for single page PDFs */}
      {numPages === 1 && (
        <div className="text-sm text-gray-500 mt-2">1 page</div>
      )}
    </div>
  );
}
