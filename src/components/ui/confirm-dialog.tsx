"use client"

import * as React from "react"
import { createContext, useContext, useState, useCallback } from "react"
import { AlertTriangle, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: "danger" | "warning" | "default"
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextType | null>(null)

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider")
  }
  return context
}

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null)

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ ...options, resolve })
    })
  }, [])

  const handleConfirm = () => {
    state?.resolve(true)
    setState(null)
  }

  const handleCancel = () => {
    state?.resolve(false)
    setState(null)
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 animate-in fade-in duration-200"
            onClick={handleCancel}
          />

          {/* Dialog */}
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div
                  className={`p-2 rounded-full ${
                    state.variant === "danger"
                      ? "bg-red-100"
                      : state.variant === "warning"
                      ? "bg-yellow-100"
                      : "bg-blue-100"
                  }`}
                >
                  {state.variant === "danger" ? (
                    <Trash2
                      className="h-5 w-5 text-red-600"
                    />
                  ) : (
                    <AlertTriangle
                      className={`h-5 w-5 ${
                        state.variant === "warning"
                          ? "text-yellow-600"
                          : "text-blue-600"
                      }`}
                    />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {state.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600">{state.message}</p>
                </div>
                <button
                  onClick={handleCancel}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end gap-3">
              <Button variant="outline" onClick={handleCancel}>
                {state.cancelText || "Отмена"}
              </Button>
              <Button
                onClick={handleConfirm}
                className={
                  state.variant === "danger"
                    ? "bg-red-600 hover:bg-red-700"
                    : state.variant === "warning"
                    ? "bg-yellow-600 hover:bg-yellow-700"
                    : ""
                }
              >
                {state.confirmText || "Подтвердить"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}
