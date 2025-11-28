"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "./Dialog"
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Inline utility for merging Tailwind classes - makes component portable
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface ConfirmationDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when the open state changes */
  onOpenChange: (open: boolean) => void
  /** Dialog title */
  title: string
  /** Dialog description/message */
  description: string
  /** Callback when user confirms */
  onConfirm: () => void
  /** Label for the confirm button */
  confirmLabel?: string
  /** Label for the cancel button */
  cancelLabel?: string
  /** Whether the action is destructive (uses destructive styling) */
  isDestructive?: boolean
  /** Text the user must type to confirm (enables 2-step verification) */
  confirmationText?: string
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDestructive = false,
  confirmationText,
}: ConfirmationDialogProps) {
  const [step, setStep] = React.useState<1 | 2>(1)
  const [inputValue, setInputValue] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setStep(1)
      setInputValue("")
    }
  }, [open])

  // Focus input when entering step 2
  React.useEffect(() => {
    if (step === 2 && inputRef.current) {
      inputRef.current.focus()
    }
  }, [step])

  const handleConfirm = () => {
    if (confirmationText && step === 1) {
      // Move to step 2 for text verification
      setStep(2)
      return
    }
    onConfirm()
    onOpenChange(false)
  }

  const handleCancel = () => {
    if (step === 2) {
      // Go back to step 1
      setStep(1)
      setInputValue("")
      return
    }
    onOpenChange(false)
  }

  const isConfirmEnabled = step === 1 || inputValue === confirmationText

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {step === 1 ? description : (
              <>
                To confirm this action, please type{" "}
                <span className="font-semibold text-foreground">{confirmationText}</span>{" "}
                below.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {step === 2 && (
          <div className="py-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isConfirmEnabled) {
                  handleConfirm()
                }
              }}
              placeholder={confirmationText}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            />
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <button
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 cursor-pointer"
            onClick={handleCancel}
          >
            {step === 2 ? "Back" : cancelLabel}
          </button>
          <button
            disabled={!isConfirmEnabled}
            className={cn(
              "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 h-10 px-4 py-2",
              isDestructive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-primary text-primary-foreground hover:bg-primary/90",
              isConfirmEnabled
                ? "cursor-pointer"
                : "opacity-50 cursor-not-allowed"
            )}
            onClick={handleConfirm}
          >
            {step === 1 && confirmationText ? "Continue" : confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
