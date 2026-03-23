import { useState, useCallback } from 'react'
import type { Stack } from '@shared/types'
import { StackList, StackEditor } from '../components/stacks'
import { Button, Modal } from '../components/ui'

/**
 * StacksView — Full page view for stack management.
 *
 * Displays the StackList and provides a modal-based StackEditor
 * for creating and editing stacks. Launch/stop actions are handled
 * by the StackList component directly.
 */
function StacksView(): React.JSX.Element {
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingStack, setEditingStack] = useState<Stack | undefined>(undefined)
  const [listKey, setListKey] = useState(0)

  const handleNew = useCallback(() => {
    setEditingStack(undefined)
    setEditorOpen(true)
  }, [])

  const handleEdit = useCallback((stack: Stack) => {
    setEditingStack(stack)
    setEditorOpen(true)
  }, [])

  const handleCancel = useCallback(() => {
    setEditorOpen(false)
    setEditingStack(undefined)
  }, [])

  const handleSave = useCallback(
    async (data: { name: string; description: string; projectIds: string[]; autoStart: boolean }) => {
      if (editingStack) {
        // Update existing stack
        await window.api.updateStack(editingStack.id, data)
      } else {
        // Create new stack
        await window.api.createStack(data)
      }
      setEditorOpen(false)
      setEditingStack(undefined)
      // Force StackList to re-fetch by changing key
      setListKey((prev) => prev + 1)
    },
    [editingStack]
  )

  return (
    <div
      className="h-full overflow-auto"
      style={{ padding: 'var(--dd-space-6)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1
            className="text-lg font-semibold"
            style={{ color: 'var(--dd-text-primary)', fontFamily: 'var(--dd-font-sans)' }}
          >
            Stacks
          </h1>
          <span
            className="text-xs"
            style={{ color: 'var(--dd-text-muted)', fontFamily: 'var(--dd-font-sans)' }}
          >
            Group projects for one-click launch
          </span>
        </div>
        <Button variant="primary" size="md" onClick={handleNew}>
          New Stack
        </Button>
      </div>

      {/* Stack list */}
      <StackList key={listKey} onEdit={handleEdit} onNew={handleNew} />

      {/* Editor modal */}
      <Modal
        open={editorOpen}
        onClose={handleCancel}
        title={editingStack ? 'Edit Stack' : 'New Stack'}
      >
        <StackEditor
          onSave={(data) => void handleSave(data)}
          onCancel={handleCancel}
          initialData={editingStack}
        />
      </Modal>
    </div>
  )
}

export { StacksView }
