"use client"

import { use } from "react"
import { ModuleEditor } from "@/components/module-editor"

interface Props {
  params: Promise<{ id: string }>
}

export default function AdminModuleEditorPage({ params }: Props) {
  const { id } = use(params)

  return <ModuleEditor moduleId={id} backUrl="/admin/content" />
}
