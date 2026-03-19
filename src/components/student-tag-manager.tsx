"use client"

import { useState, useEffect, useCallback } from "react"
import { StudentTagsBadges, type TagInfo } from "@/components/student-tags-badges"
import { TagAssignDropdown } from "@/components/tag-assign-dropdown"

interface StudentTagManagerProps {
  studentId: string
  initialTags: TagInfo[]
}

export function StudentTagManager({ studentId, initialTags }: StudentTagManagerProps) {
  const [tags, setTags] = useState<TagInfo[]>(initialTags)
  const [allTags, setAllTags] = useState<TagInfo[]>([])

  useEffect(() => {
    fetch("/api/admin/student-tags")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) =>
        setAllTags(
          data.map((t: { id: string; name: string; color: string }) => ({
            id: t.id,
            name: t.name,
            color: t.color,
          }))
        )
      )
      .catch(() => {})
  }, [])

  const handleAssign = useCallback(
    async (tagId: string) => {
      try {
        const res = await fetch("/api/admin/student-tag-assignments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId, tagId }),
        })
        if (res.ok) {
          const data = await res.json()
          setTags((prev) => [...prev, data.tag])
        }
      } catch {}
    },
    [studentId]
  )

  const handleRemove = useCallback(
    async (tagId: string) => {
      try {
        const res = await fetch(
          `/api/admin/student-tag-assignments?studentId=${studentId}&tagId=${tagId}`,
          { method: "DELETE" }
        )
        if (res.ok) {
          setTags((prev) => prev.filter((t) => t.id !== tagId))
        }
      } catch {}
    },
    [studentId]
  )

  const handleCreateAndAssign = useCallback(
    async (name: string, color: string) => {
      try {
        const createRes = await fetch("/api/admin/student-tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, color }),
        })
        const createData = await createRes.json()

        let tagId: string
        if (createRes.ok) {
          tagId = createData.id
          setAllTags((prev) => [...prev, { id: createData.id, name: createData.name, color: createData.color }])
        } else if (createData.tag) {
          tagId = createData.tag.id
        } else {
          return
        }

        await handleAssign(tagId)
      } catch {}
    },
    [handleAssign]
  )

  const handleEditTag = useCallback(
    async (tagId: string, name: string, color: string) => {
      try {
        const res = await fetch("/api/admin/student-tags", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: tagId, name, color }),
        })
        if (!res.ok) return
        const updated = await res.json()
        setAllTags((prev) => prev.map((t) => (t.id === tagId ? { ...t, name: updated.name, color: updated.color } : t)))
        setTags((prev) => prev.map((t) => (t.id === tagId ? { ...t, name: updated.name, color: updated.color } : t)))
      } catch {}
    },
    []
  )

  const handleDeleteTag = useCallback(
    async (tagId: string) => {
      try {
        const res = await fetch(`/api/admin/student-tags?id=${tagId}`, { method: "DELETE" })
        if (!res.ok) return
        setAllTags((prev) => prev.filter((t) => t.id !== tagId))
        setTags((prev) => prev.filter((t) => t.id !== tagId))
      } catch {}
    },
    []
  )

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <StudentTagsBadges tags={tags} maxVisible={5} onRemove={handleRemove} />
      <TagAssignDropdown
        availableTags={allTags}
        assignedTagIds={tags.map((t) => t.id)}
        onAssign={handleAssign}
        onCreateAndAssign={handleCreateAndAssign}
        onEditTag={handleEditTag}
        onDeleteTag={handleDeleteTag}
      />
    </div>
  )
}
