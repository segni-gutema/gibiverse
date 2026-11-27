export function formatRelativeUploadDate(
  createdAt: string,
  now: Date = new Date()
): string {
  const then = new Date(createdAt)
  const diffMs = Math.max(0, now.getTime() - then.getTime())
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return "just now"
  if (minutes < 60) {
    return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`
  }
  const days = Math.floor(hours / 24)
  return days === 1 ? "1 day ago" : `${days} days ago`
}
