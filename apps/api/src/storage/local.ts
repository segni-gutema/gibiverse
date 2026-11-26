import { createReadStream } from "node:fs"
import { access, mkdir, unlink, writeFile, stat } from "node:fs/promises"
import path from "node:path"
import { Readable } from "node:stream"
import type {
  StorageProvider,
  StoragePutOptions,
  StorageUrlOptions,
} from "./types.js"

type LocalStorageOptions = {
  basePath: string
}

async function streamToBuffer(
  data: Buffer | ReadableStream<Uint8Array>
): Promise<Buffer> {
  if (Buffer.isBuffer(data)) return data

  const reader = data.getReader()
  const chunks: Uint8Array[] = []
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c)))
}

function assertSafeKey(key: string): void {
  if (!key || key.includes("\0") || path.isAbsolute(key)) {
    throw new Error("Invalid storage key")
  }
  const normalized = path.normalize(key)
  if (normalized.startsWith("..") || normalized.includes(`${path.sep}..`)) {
    throw new Error("Invalid storage key")
  }
}

export class LocalStorage implements StorageProvider {
  private readonly basePath: string
  private readonly contentTypes = new Map<string, string>()

  constructor(options: LocalStorageOptions) {
    this.basePath = path.resolve(options.basePath)
  }

  private resolveKeyPath(key: string): string {
    assertSafeKey(key)
    return path.join(this.basePath, key)
  }

  async put(
    key: string,
    data: Buffer | ReadableStream<Uint8Array>,
    opts?: StoragePutOptions
  ): Promise<{ key: string; size: number }> {
    const filePath = this.resolveKeyPath(key)
    await mkdir(path.dirname(filePath), { recursive: true })
    const buffer = await streamToBuffer(data)
    await writeFile(filePath, buffer)
    this.contentTypes.set(key, opts?.contentType ?? "application/octet-stream")
    return { key, size: buffer.byteLength }
  }

  async get(key: string) {
    const filePath = this.resolveKeyPath(key)
    try {
      await access(filePath)
    } catch {
      return null
    }

    const fileStat = await stat(filePath)
    const nodeStream = createReadStream(filePath)
    const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>

    return {
      stream: webStream,
      contentType: this.contentTypes.get(key) ?? "application/octet-stream",
      size: fileStat.size,
    }
  }

  async delete(key: string): Promise<void> {
    const filePath = this.resolveKeyPath(key)
    try {
      await unlink(filePath)
    } catch {
      // missing key is a no-op
    }
    this.contentTypes.delete(key)
  }

  async exists(key: string): Promise<boolean> {
    const filePath = this.resolveKeyPath(key)
    try {
      await access(filePath)
      return true
    } catch {
      return false
    }
  }

  async getUrl(key: string, opts?: StorageUrlOptions): Promise<string> {
    assertSafeKey(key)
    const disposition = opts?.disposition ?? "inline"
    return `/api/files/${encodeURIComponent(key)}?disposition=${disposition}`
  }
}
