"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Plus, Trash2, Copy, Check, Ticket } from "lucide-react"

interface Invite {
  id: string
  code: string
  email: string | null
  maxUses: number
  usedCount: number
  expiresAt: string | null
  createdAt: string
  createdBy: { name: string; email: string }
}

export default function AdminInvitesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [invites, setInvites] = useState<Invite[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const [newInvite, setNewInvite] = useState({
    code: "",
    email: "",
    maxUses: 1,
    expiresAt: "",
  })

  useEffect(() => {
    if (status === "loading") return

    if (!session || session.user.role !== "ADMIN") {
      router.push("/")
      return
    }

    fetchInvites()
  }, [session, status, router])

  const fetchInvites = async () => {
    try {
      const res = await fetch("/api/invites")
      if (res.ok) {
        const data = await res.json()
        setInvites(data)
      }
    } catch (error) {
      console.error("Error fetching invites:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const createInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)

    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newInvite,
          code: newInvite.code.toUpperCase(),
        }),
      })

      if (res.ok) {
        setNewInvite({ code: "", email: "", maxUses: 1, expiresAt: "" })
        fetchInvites()
      } else {
        const data = await res.json()
        alert(data.error)
      }
    } catch (error) {
      console.error("Error creating invite:", error)
    } finally {
      setIsCreating(false)
    }
  }

  const deleteInvite = async (id: string) => {
    if (!confirm("Удалить это приглашение?")) return

    try {
      const res = await fetch(`/api/invites?id=${id}`, { method: "DELETE" })
      if (res.ok) {
        fetchInvites()
      }
    } catch (error) {
      console.error("Error deleting invite:", error)
    }
  }

  const copyInviteLink = (code: string, id: string) => {
    const link = `${window.location.origin}/register?invite=${code}`
    navigator.clipboard.writeText(link)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const generateRandomCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let code = ""
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setNewInvite({ ...newInvite, code })
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  if (!session || session.user.role !== "ADMIN") {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500">
            <Ticket className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Управление приглашениями</h1>
            <p className="text-slate-500 text-sm">Создавайте и управляйте кодами приглашений</p>
          </div>
        </div>

        {/* Create New Invite */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Создать приглашение</h2>
          <form onSubmit={createInvite} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Код приглашения</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    value={newInvite.code}
                    onChange={(e) => setNewInvite({ ...newInvite, code: e.target.value.toUpperCase() })}
                    placeholder="MYCODE2024"
                    className="uppercase"
                    required
                  />
                  <Button type="button" variant="outline" onClick={generateRandomCode}>
                    Сгенерировать
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email (опционально)</Label>
                <Input
                  id="email"
                  type="email"
                  value={newInvite.email}
                  onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })}
                  placeholder="user@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxUses">Макс. использований</Label>
                <Input
                  id="maxUses"
                  type="number"
                  min="1"
                  value={newInvite.maxUses}
                  onChange={(e) => setNewInvite({ ...newInvite, maxUses: parseInt(e.target.value) || 1 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiresAt">Истекает (опционально)</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={newInvite.expiresAt}
                  onChange={(e) => setNewInvite({ ...newInvite, expiresAt: e.target.value })}
                />
              </div>
            </div>

            <Button type="submit" disabled={isCreating} className="bg-orange-500 hover:bg-orange-600">
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Создать приглашение
            </Button>
          </form>
        </div>

        {/* Invites List */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Все приглашения ({invites.length})</h2>
          </div>

          {invites.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              Приглашений пока нет
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {invites.map((invite) => (
                <div key={invite.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <code className="px-3 py-1 bg-slate-100 rounded-lg font-mono text-sm font-semibold text-slate-900">
                          {invite.code}
                        </code>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          invite.usedCount >= invite.maxUses
                            ? "bg-red-100 text-red-600"
                            : "bg-green-100 text-green-600"
                        }`}>
                          {invite.usedCount} / {invite.maxUses}
                        </span>
                        {invite.email && (
                          <span className="text-xs text-slate-500">
                            для {invite.email}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        Создан {new Date(invite.createdAt).toLocaleDateString("ru")}
                        {invite.expiresAt && (
                          <> · Истекает {new Date(invite.expiresAt).toLocaleDateString("ru")}</>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyInviteLink(invite.code, invite.id)}
                        className="text-slate-600"
                      >
                        {copiedId === invite.id ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteInvite(invite.id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
