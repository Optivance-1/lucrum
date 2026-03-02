import { StripeDataProvider } from '@/contexts/StripeDataContext'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-obsidian">
      <StripeDataProvider>{children}</StripeDataProvider>
    </div>
  )
}
