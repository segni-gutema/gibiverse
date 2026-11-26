#!/usr/bin/env node
/**
 * Enforces GLOSSARY.md _Avoid_ terms.
 * Scans UI files, route handlers, and presentation modules for banned terms.
 * Run via: pnpm check-glossary (or: npx tsx scripts/check-glossary.ts)
 */
import { readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..")

export type GlossaryRule = {
  pattern: RegExp
  avoid: string
  preferred: string
}

export type GlossaryViolation = {
  file: string
  line: number
  avoid: string
  preferred: string
  text: string
}

// High-confidence banned domain terms from GLOSSARY.md _Avoid_ directives:
// Term pattern and the canonical replacement
export const domainRules: GlossaryRule[] = [
  // University: _Avoid_: School, institution, college
  { pattern: /\bschools?\b/i, avoid: "school(s)", preferred: "university" },
  {
    pattern: /\binstitutions?\b/i,
    avoid: "institution(s)",
    preferred: "university",
  },
  { pattern: /\bcolleges?\b/i, avoid: "college(s)", preferred: "university" },

  // Department: _Avoid_: Faculty, school, division
  {
    pattern: /\bfacult(?:y|ies)\b/i,
    avoid: "faculty/faculties",
    preferred: "department(s)",
  },
  {
    pattern: /\bdivisions?\b/i,
    avoid: "division(s)",
    preferred: "department(s)",
  },

  // Course: _Avoid_: Class, subject, module
  { pattern: /\bclasses\b/i, avoid: "classes", preferred: "courses" },
  { pattern: /\bsubjects?\b/i, avoid: "subject(s)", preferred: "course(s)" },
  { pattern: /\bmodules?\b/i, avoid: "module(s)", preferred: "course(s)" },

  // Course Material & Course Material Type: _Avoid_: Resource, Resource type, category
  {
    pattern: /\b[a-zA-Z]*resource[a-zA-Z]*\b/i,
    avoid: "resource(s)",
    preferred: "course material(s)",
  },
  {
    pattern: /\bcategor(?:y|ies)\b/i,
    avoid: "category/categories",
    preferred: "course material type",
  },

  // Academic Period: _Avoid_: Quarter
  {
    pattern: /\bquarters?\b/i,
    avoid: "quarter(s)",
    preferred: "academic period(s)",
  },

  // Student: _Avoid_: Member, account, profile
  { pattern: /\bmembers?\b/i, avoid: "member(s)", preferred: "student(s)" },
  { pattern: /\baccounts?\b/i, avoid: "account(s)", preferred: "student(s)" },
  { pattern: /\bprofiles?\b/i, avoid: "profile(s)", preferred: "student(s)" },

  // Q&A / Question: _Avoid_: Discussion thread, thread, topic
  {
    pattern: /\bdiscussion threads?\b/i,
    avoid: "discussion thread(s)",
    preferred: "Q&A",
  },
  {
    pattern: /\bthreads?\b/i,
    avoid: "thread(s)",
    preferred: "Q&A / question",
  },
  { pattern: /\btopics?\b/i, avoid: "topic(s)", preferred: "question(s)" },

  // Answer: _Avoid_: Reply, comment
  {
    pattern: /\brepl(?:y|ies)\b/i,
    avoid: "reply/replies",
    preferred: "answer(s)",
  },
  { pattern: /\bcomments?\b/i, avoid: "comment(s)", preferred: "answer(s)" },

  // Accepted Answer: _Avoid_: Best answer, correct answer, solution
  {
    pattern: /\bbest answers?\b/i,
    avoid: "best answer(s)",
    preferred: "accepted answer",
  },
  {
    pattern: /\bcorrect answers?\b/i,
    avoid: "correct answer(s)",
    preferred: "accepted answer",
  },
  { pattern: /\bsolutions\b/i, avoid: "solutions", preferred: "answers" },
  { pattern: /\bsolution\b/i, avoid: "solution", preferred: "answer" },

  // Vote: _Avoid_: Reaction, rating
  { pattern: /\breactions?\b/i, avoid: "reaction(s)", preferred: "vote(s)" },
  { pattern: /\bratings?\b/i, avoid: "rating(s)", preferred: "vote(s)" },
]

// Target directories for domain terminology checks
const scanDirs = [
  path.join(rootDir, "apps/web/app"),
  path.join(rootDir, "apps/web/components"),
  path.join(rootDir, "apps/api/src/routes"),
]

// Allowed exceptions (e.g. third-party library names, raw markdown components)
const ignoredFiles = ["markdown-renderer.tsx"]

export function findGlossaryViolations(
  content: string,
  relativePath: string
): GlossaryViolation[] {
  const violations: GlossaryViolation[] = []
  const lines = content.split("\n")

  lines.forEach((line, index) => {
    const trimmed = line.trim()
    if (
      trimmed.startsWith("//") ||
      trimmed.startsWith("/*") ||
      trimmed.startsWith("*")
    ) {
      return
    }
    if (trimmed.startsWith("import ") || trimmed.startsWith("export type ")) {
      return
    }

    for (const rule of domainRules) {
      if (rule.pattern.test(line)) {
        violations.push({
          file: relativePath,
          line: index + 1,
          avoid: rule.avoid,
          preferred: rule.preferred,
          text: trimmed,
        })
      }
    }
  })

  return violations
}

function collectFiles(dir: string, fileList: string[] = []): string[] {
  try {
    const entries = readdirSync(dir)
    for (const entry of entries) {
      const fullPath = path.join(dir, entry)
      const stat = statSync(fullPath)
      if (stat.isDirectory()) {
        collectFiles(fullPath, fileList)
      } else if (/\.(ts|tsx)$/.test(entry) && !ignoredFiles.includes(entry)) {
        fileList.push(fullPath)
      }
    }
  } catch {
    // Directory might not exist or be empty
  }
  return fileList
}

function main() {
  let violationsCount = 0

  for (const dir of scanDirs) {
    const files = collectFiles(dir)
    for (const file of files) {
      const relativePath = path.relative(rootDir, file)
      const content = readFileSync(file, "utf8")
      const violations = findGlossaryViolations(content, relativePath)

      for (const violation of violations) {
        console.error(
          `\n❌ Glossary violation in ${violation.file}:${violation.line}:`
        )
        console.error(
          `   Found avoided term "${violation.avoid}" -> prefer "${violation.preferred}"`
        )
        console.error(`   ${violation.text}`)
        violationsCount++
      }
    }
  }

  if (violationsCount > 0) {
    console.error(
      `\nFound ${violationsCount} glossary violation(s). See GLOSSARY.md for canonical terms.\n`
    )
    process.exit(1)
  } else {
    console.log("✅ No glossary violations found in domain modules.")
    process.exit(0)
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main()
}
