"use client"

import React, { useState, useEffect, useRef } from "react"
import { Reorder, useDragControls } from "framer-motion"
import { toast, Toaster, ToastProvider, ToastRegistry } from "@/_barron-agency/components/Toast"
import { PlusIcon } from "@/_barron-agency/icons/PlusIcon"
import { GripVerticalIcon } from "@/_barron-agency/icons/GripVerticalIcon"
import { useQueryClient } from "@tanstack/react-query"
import { ItemCard } from "@/_barron-agency/components/ItemCard"
import { Button } from "@/_barron-agency/components/Button"
import { PageHeader } from "@/_barron-agency/components/PageHeader"
import { EmptyState } from "@/_barron-agency/components/EmptyState"
import type { Item, Attachment } from "@/_barron-agency/types"
import {
  useCreateItem,
  useUpdateItem,
  useDeleteItem,
  useDuplicateItem,
  useReorderItems,
} from "@/_barron-agency/hooks/useItems"
import {
  useAddAttachments,
  useRemoveAttachment,
} from "@/_barron-agency/hooks/useAttachments"

// Helper function to generate unique IDs
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// ReorderableItem component for drag-and-drop
interface ReorderableItemProps {
  item: Item
  editingItemId: string | null
  onEdit: (id: string) => void
  onSave: (id: string, data: { title: string; description: string }) => void
  onCancel: (id: string) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onFilesAdded: (itemId: string, files: File[]) => void
  onFileRemove: (itemId: string, attachmentId: string) => void
  autoFocus?: boolean
  isSaving?: boolean
}

function ReorderableItem({
  item,
  editingItemId,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onDuplicate,
  onFilesAdded,
  onFileRemove,
  autoFocus,
  isSaving,
}: ReorderableItemProps) {
  const dragControls = useDragControls()
  const isEditing = editingItemId === item.id

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={dragControls}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="relative"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="flex items-start gap-2 w-full">
        {/* Drag Handle */}
        <div
          className="flex-shrink-0 cursor-grab active:cursor-grabbing pt-6"
          onPointerDown={(e) => {
            if (!isEditing) {
              dragControls.start(e)
            }
          }}
        >
          <GripVerticalIcon className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
        </div>

        {/* Item Card */}
        <div className="flex-1 min-w-0">
          <ItemCard
            itemId={item.id}
            title={item.title}
            description={item.description}
            editable={true}
            onEdit={() => onEdit(item.id)}
            onSave={(data) => onSave(item.id, data)}
            onCancel={() => onCancel(item.id)}
            onDelete={() => onDelete(item.id)}
            onDuplicate={() => onDuplicate(item.id)}
            autoFocus={autoFocus}
            attachments={item.attachments}
            onFilesAdded={(files) => onFilesAdded(item.id, files)}
            onFileRemove={(attachmentId) => onFileRemove(item.id, attachmentId)}
            isSaving={isSaving}
          />
        </div>
      </div>
    </Reorder.Item>
  )
}

export default function DemoPage() {
  const queryClient = useQueryClient()
  const [items, setItems] = useState<Item[]>([])
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [savingItemId, setSavingItemId] = useState<string | null>(null)
  const stableKeysRef = useRef<Map<string, string>>(new Map())

  // React Query mutations
  const createItemMutation = useCreateItem()
  const updateItemMutation = useUpdateItem()
  const deleteItemMutation = useDeleteItem()
  const duplicateItemMutation = useDuplicateItem()
  const reorderItemsMutation = useReorderItems()
  const addAttachmentsMutation = useAddAttachments()
  const removeAttachmentMutation = useRemoveAttachment()

  // Initialize QueryClient with items data
  useEffect(() => {
    queryClient.setQueryData<Item[]>(['items'], items)
  }, [items, queryClient])

  // Subscribe to QueryClient changes
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.query.queryKey[0] === 'items') {
        const data = queryClient.getQueryData<Item[]>(['items'])
        if (data) {
          setItems(data)
        }
      }
    })

    return () => unsubscribe()
  }, [queryClient])

  // Load items from localStorage on mount
  useEffect(() => {
    const savedItems = localStorage.getItem("demo-items")
    if (savedItems) {
      try {
        const parsed = JSON.parse(savedItems)
        setItems(parsed)
        queryClient.setQueryData<Item[]>(['items'], parsed)
      } catch (error) {
        console.error("Failed to parse saved items:", error)
      }
    }
  }, [queryClient])

  // Save items to localStorage whenever they change
  useEffect(() => {
    if (items.length > 0) {
      localStorage.setItem("demo-items", JSON.stringify(items))
    }
  }, [items])

  // Handle adding a new item
  const handleNewItem = () => {
    const newId = generateId()
    const stableKey = `stable-${Date.now()}`

    const newItem: Item = {
      id: newId,
      title: "",
      description: "",
      order: 0,
      attachments: [],
    }

    stableKeysRef.current.set(newId, stableKey)

    // Add to top of list (order: 0) and increment existing items' order
    setItems((prev) => {
      const updatedItems = prev.map((item) => ({
        ...item,
        order: item.order + 1,
      }))
      return [newItem, ...updatedItems]
    })

    queryClient.setQueryData<Item[]>(['items'], (old = []) => {
      const updatedItems = old.map((item) => ({
        ...item,
        order: item.order + 1,
      }))
      return [newItem, ...updatedItems]
    })

    setEditingItemId(newId)
    toast.success("New item created")
  }

  // Handle editing an item
  const handleEdit = (id: string) => {
    setEditingItemId(id)
  }

  // Handle saving an item with optimistic update
  const handleSave = async (id: string, data: { title: string; description: string }) => {
    setSavingItemId(id)

    try {
      await updateItemMutation.mutateAsync({ id, ...data })
      setEditingItemId(null)
      toast.success("Item saved successfully")
    } catch (error) {
      toast.error("Failed to save item - changes reverted")
      console.error("Save error:", error)
    } finally {
      setSavingItemId(null)
    }
  }

  // Handle canceling edit
  const handleCancel = (id: string) => {
    const item = items.find((i) => i.id === id)

    // If it's a new item with no content, remove it
    if (item && !item.title && !item.description) {
      setItems((prev) => prev.filter((i) => i.id !== id))
      queryClient.setQueryData<Item[]>(['items'], (old = []) => old.filter((i) => i.id !== id))
      stableKeysRef.current.delete(id)
      toast.info("Empty item removed")
    }

    setEditingItemId(null)
  }

  // Handle deleting an item with optimistic update
  const handleDelete = async (id: string) => {
    try {
      await deleteItemMutation.mutateAsync({ id })

      stableKeysRef.current.delete(id)

      if (editingItemId === id) {
        setEditingItemId(null)
      }

      toast.success("Item deleted")
    } catch (error) {
      // Show modal confirmation on error
      const shouldRetry = confirm("Failed to delete item. The item has been restored. Would you like to try again?")

      if (shouldRetry) {
        handleDelete(id)
      }

      console.error("Delete error:", error)
    }
  }

  // Handle duplicating an item with optimistic update
  const handleDuplicate = async (id: string) => {
    try {
      const result = await duplicateItemMutation.mutateAsync(id)

      const stableKey = `stable-${Date.now()}`
      stableKeysRef.current.set(result.id, stableKey)

      toast.success("Item duplicated")
    } catch (error) {
      // Show modal confirmation on error
      const shouldRetry = confirm("Failed to duplicate item. Would you like to try again?")

      if (shouldRetry) {
        handleDuplicate(id)
      }

      console.error("Duplicate error:", error)
    }
  }

  // Handle reordering items with optimistic update
  const handleReorder = async (newOrder: Item[]) => {
    // Update order for each item
    const reorderedItems = newOrder.map((item, index) => ({
      ...item,
      order: index,
    }))

    try {
      await reorderItemsMutation.mutateAsync({ items: reorderedItems })
      // toast.success("Order updated") // Commented out to avoid spam
    } catch (error) {
      // Show modal confirmation on error
      const shouldRetry = confirm("Failed to update order. The order has been reverted. Would you like to try again?")

      if (shouldRetry) {
        handleReorder(newOrder)
      }

      console.error("Reorder error:", error)
    }
  }

  // Handle adding files to an item with optimistic update
  const handleFilesAdded = async (itemId: string, files: File[]) => {
    try {
      await addAttachmentsMutation.mutateAsync({ itemId, files })
      toast.success(`${files.length} file(s) added`)
    } catch (error) {
      // Show modal confirmation on error
      const shouldRetry = confirm("Failed to upload files. Would you like to try again?")

      if (shouldRetry) {
        handleFilesAdded(itemId, files)
      }

      console.error("File upload error:", error)
    }
  }

  // Handle removing a file from an item with optimistic update
  const handleFileRemove = async (itemId: string, attachmentId: string) => {
    try {
      await removeAttachmentMutation.mutateAsync({ itemId, attachmentId })
      toast.success("File removed")
    } catch (error) {
      // Show modal confirmation on error
      const shouldRetry = confirm("Failed to remove file. The file has been restored. Would you like to try again?")

      if (shouldRetry) {
        handleFileRemove(itemId, attachmentId)
      }

      console.error("File remove error:", error)
    }
  }

  return (
    <ToastProvider>
      <ToastRegistry />
      <Toaster />
      <div className="min-h-screen bg-background">
        <div className="p-8 space-y-6">
        {/* Header */}
        <PageHeader
          title="ItemCard Demo"
          description="A fully functional demonstration with optimistic updates for instant-feel interactions."
        />

        {/* Add Button */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? "item" : "items"}
          </div>
          <Button
            onClick={handleNewItem}
            className="gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            Add Item
          </Button>
        </div>

        {/* Items List */}
        {items.length === 0 ? (
          <EmptyState
            title="No items yet"
            description="Click 'Add Item' to get started."
          />
        ) : (
          <Reorder.Group
            axis="y"
            values={items}
            onReorder={handleReorder}
            className="flex flex-col gap-4 w-full touch-pan-y select-none"
          >
            {items.map((item) => {
              const stableKey = stableKeysRef.current.get(item.id) || item.id

              return (
                <ReorderableItem
                  key={stableKey}
                  item={item}
                  editingItemId={editingItemId}
                  onEdit={handleEdit}
                  onSave={handleSave}
                  onCancel={handleCancel}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                  onFilesAdded={handleFilesAdded}
                  onFileRemove={handleFileRemove}
                  autoFocus={editingItemId === item.id}
                  isSaving={savingItemId === item.id}
                />
              )
            })}
          </Reorder.Group>
        )}

        {/* Footer Info */}
        <div className="text-xs text-muted-foreground border-t pt-4 space-y-1">
          <p>
            <strong>Features:</strong> Optimistic updates, instant feedback, automatic rollback on errors
          </p>
          <p>
            <strong>Persistence:</strong> Items saved to localStorage
          </p>
          <p>
            <strong>Keyboard shortcuts:</strong> Enter to save, Escape to cancel
          </p>
          <p className="mt-2 text-primary">
            <strong>True Single-Folder Architecture:</strong> All components imported from @/_barron-agency/
          </p>
        </div>
      </div>
      </div>
    </ToastProvider>
  )
}