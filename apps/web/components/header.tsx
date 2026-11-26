"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  Menu,
  X,
  GraduationCap,
  LogOut,
  BookOpen,
  Library,
  MessageSquareQuote,
  Search,
} from "lucide-react"
import { Button } from "@gibiverse/ui/components/button"
import { Input } from "@gibiverse/ui/components/input"
import { cn } from "@gibiverse/ui/lib/utils"
import { useSession, signOut } from "@/lib/auth-client"

export interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

export const navItems: NavItem[] = [
  { label: "Courses", href: "/courses", icon: Library },
  { label: "Course Materials", href: "/course-materials", icon: BookOpen },
  { label: "Q&A", href: "/questions", icon: MessageSquareQuote },
]

interface StudentAvatarProps {
  student: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
  size?: "sm" | "md"
}

export function getAvatarInitials(student?: {
  name?: string | null
  email?: string | null
}): string {
  if (student?.name) {
    const letters = student.name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
    if (letters) return letters
  }
  if (student?.email) {
    return student.email.slice(0, 2).toUpperCase()
  }
  return "ST"
}

export function StudentAvatar({ student, size = "sm" }: StudentAvatarProps) {
  const initials = getAvatarInitials(student)

  const sizeClass = size === "md" ? "size-8" : "size-7"
  const sizePx = size === "md" ? 32 : 28

  if (student.image) {
    return (
      <Image
        src={student.image}
        alt={student.name || "Student Avatar"}
        width={sizePx}
        height={sizePx}
        unoptimized
        className={`${sizeClass} rounded-full object-cover`}
      />
    )
  }

  return (
    <div
      className={`flex ${sizeClass} items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary`}
    >
      {initials}
    </div>
  )
}

function HeaderSearchBar({
  onSubmitted,
  className,
}: {
  onSubmitted?: () => void
  className?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const qParam = searchParams.get("q")
  const [query, setQuery] = React.useState(qParam ?? "")
  const [prevQParam, setPrevQParam] = React.useState(qParam)
  if (qParam !== prevQParam) {
    setPrevQParam(qParam)
    if (qParam !== null) {
      setQuery(qParam)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = query.trim()
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`)
    } else {
      router.push("/search")
    }
    onSubmitted?.()
  }

  return (
    <form
      role="search"
      action="/search"
      method="GET"
      onSubmit={handleSubmit}
      className={cn("relative w-full", className)}
    >
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        name="q"
        placeholder="Search course materials, questions, course codes..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="h-9 w-full rounded-md border border-input bg-muted/40 pr-3 pl-9 text-sm transition-colors hover:bg-muted/60 focus-visible:bg-background"
        aria-label="Search platform"
        data-testid="header-search-input"
      />
    </form>
  )
}

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, isPending } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const [avatarMenuOpen, setAvatarMenuOpen] = React.useState(false)
  const avatarMenuRef = React.useRef<HTMLDivElement>(null)

  // Close avatar dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        avatarMenuRef.current &&
        !avatarMenuRef.current.contains(event.target as Node)
      ) {
        setAvatarMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Close menus when route changes
  const [prevPathname, setPrevPathname] = React.useState(pathname)
  if (pathname !== prevPathname) {
    setPrevPathname(pathname)
    setMobileMenuOpen(false)
    setAvatarMenuOpen(false)
  }

  const handleSignOut = async () => {
    await signOut()
    setAvatarMenuOpen(false)
    router.refresh()
  }

  const student = session?.user

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Platform Logo */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground transition-opacity hover:opacity-90"
            aria-label="Gibiverse Home"
          >
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <GraduationCap className="size-5" />
            </div>
            <span>Gibiverse</span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav
            className="hidden items-center gap-1 md:flex"
            aria-label="Main Navigation"
          >
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-accent font-semibold text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  }`}
                >
                  <item.icon className="size-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Desktop Search Bar */}
        <div className="mx-4 hidden max-w-xs flex-1 md:block lg:max-w-sm">
          <React.Suspense
            fallback={
              <div className="h-9 w-full animate-pulse rounded-md bg-muted/40" />
            }
          >
            <HeaderSearchBar />
          </React.Suspense>
        </div>

        {/* Desktop Auth Controls */}
        <div className="hidden items-center gap-3 md:flex">
          {isPending ? (
            <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
          ) : student ? (
            /* Authenticated Student Avatar Menu */
            <div className="relative" ref={avatarMenuRef}>
              <button
                type="button"
                onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
                className="flex size-9 items-center justify-center rounded-full border border-border transition-colors hover:bg-accent focus:ring-2 focus:ring-ring focus:outline-none"
                aria-expanded={avatarMenuOpen}
                aria-haspopup="menu"
                aria-label="Student menu"
                data-testid="student-avatar-trigger"
              >
                <StudentAvatar student={student} size="sm" />
              </button>

              {/* Avatar Dropdown */}
              {avatarMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg focus:outline-none"
                  data-testid="student-avatar-menu"
                >
                  <div className="mb-1 border-b border-border px-3 py-2">
                    <p className="truncate text-sm font-medium text-foreground">
                      {student.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {student.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
                    role="menuitem"
                    data-testid="sign-out-button"
                  >
                    <LogOut className="size-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Unauthenticated Actions */
            <div className="flex items-center gap-2">
              <Link href="/sign-in">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button size="sm">Sign Up</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex size-9 items-center justify-center rounded-md border border-border text-foreground hover:bg-accent focus:ring-2 focus:ring-ring focus:outline-none"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="size-5" />
            ) : (
              <Menu className="size-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer / Dropdown */}
      {mobileMenuOpen && (
        <div className="space-y-4 border-t border-border bg-background px-4 py-4 shadow-lg md:hidden">
          <div className="pb-1">
            <React.Suspense
              fallback={
                <div className="h-9 w-full animate-pulse rounded-md bg-muted/40" />
              }
            >
              <HeaderSearchBar onSubmitted={() => setMobileMenuOpen(false)} />
            </React.Suspense>
          </div>

          <nav
            className="flex flex-col space-y-1"
            aria-label="Mobile Navigation"
          >
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-accent font-semibold text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  }`}
                >
                  <item.icon className="size-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="border-t border-border pt-3">
            {student ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 px-3 py-1">
                  <StudentAvatar student={student} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {student.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {student.email}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full justify-start text-destructive hover:bg-destructive/10"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 size-4" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link href="/sign-in" className="w-full">
                  <Button variant="outline" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link href="/sign-up" className="w-full">
                  <Button className="w-full">Sign Up</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
