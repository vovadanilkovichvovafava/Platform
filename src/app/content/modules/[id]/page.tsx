"use client"

import { use } from "react"
import { useSession } from "next-auth/react"
import { ModuleEditor } from "@/components/module-editor"

interface Props {
  params: Promise<{ id: string }>
}

export default function ModuleEditorPage({ params }: Props) {
  const { id } = use(params)
  const { data: session } = useSession()

  // Determine backUrl based on user role
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "CO_ADMIN"
  const backUrl = isAdmin ? "/admin/content" : "/content"
  const readOnly = session?.user?.role === "TEACHER"

  return <ModuleEditor moduleId={id} backUrl={backUrl} readOnly={readOnly} />
}
