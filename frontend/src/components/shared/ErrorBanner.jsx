export default function ErrorBanner({ message }) {
  if (!message) return null
  return (
    <div className="rounded-lg border border-grade-f/40 bg-grade-f/10 px-3 py-2 text-sm text-grade-f">
      {message}
    </div>
  )
}
