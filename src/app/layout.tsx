import type { Metadata } from "next"
import "./globals.css"
import { AuthProvider } from "@/components/providers/session-provider"
import { Header } from "@/components/header"
import { ToastProvider } from "@/components/ui/toast"
import { ConfirmProvider } from "@/components/ui/confirm-dialog"

export const metadata: Metadata = {
  title: "R&D Academy - Обучающая платформа",
  description: "Научись создавать продукты с помощью AI. Vibe Coding, маркетинг, UI дизайн и R&D.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru">
      <head>
        <link rel="preload" href="/hero-bg.jpg" as="image" type="image/jpeg" fetchPriority="high" />
      </head>
      <body className="antialiased">
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider>
              <Header />
              <main>{children}</main>
            </ConfirmProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
