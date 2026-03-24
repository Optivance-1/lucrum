'use client'
export default function GlobalError() {
  return (
    <html>
      <body className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
          <p className="text-sm text-slate-300">
            An unexpected error occurred. Please try refreshing the page. If the problem
            persists, contact support with a description of what you were doing.
          </p>
        </div>
      </body>
    </html>
  )
}


