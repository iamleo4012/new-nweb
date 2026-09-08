import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_SIZE = 8 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

function forbidden() {
  return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 });
}

/**
 * Magic-byte sniffing — the declared MIME type and filename extension are
 * client-controlled and cannot be trusted. The actual bytes determine the
 * type; the extension is then derived from the sniffed type so a renamed
 * HTML/polyglot file can never be stored or served as an image.
 * Returns the canonical extension, or null if the bytes match no allowed type.
 */
function sniffImageType(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg"; // JPEG
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 && buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a) return "png";
  if (buf.length >= 6 && buf.toString("ascii", 0, 3) === "GIF") return "gif"; // GIF87a/GIF89a
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  // ISO-BMFF container (AVIF): "....ftyp" with a brand starting avif/avis
  if (buf.length >= 12 && buf.toString("ascii", 4, 8) === "ftyp") {
    const brand = buf.toString("ascii", 8, 12);
    if (brand.startsWith("avif") || brand.startsWith("avis")) return "avif";
  }
  return null;
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return forbidden();

  const form = await req.formData();
  const files = form.getAll("file").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ success: false, data: null, error: "No file provided" }, { status: 400 });
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const urls: string[] = [];
  for (const file of files) {
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ success: false, data: null, error: `File ${file.name} exceeds 8MB limit` }, { status: 413 });
    }
    // Declared MIME must be present AND allowed — an empty Content-Type is no
    // longer accepted (previously it bypassed this check entirely).
    if (!file.type || !ALLOWED.has(file.type)) {
      return NextResponse.json({ success: false, data: null, error: `File type ${file.type || "(none)"} not allowed` }, { status: 415 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // Enforce the limit on the REAL byte length, not the declared size.
    if (buffer.length > MAX_SIZE) {
      return NextResponse.json({ success: false, data: null, error: `File ${file.name} exceeds 8MB limit` }, { status: 413 });
    }

    // Authoritative type check: sniff the magic bytes. The stored extension
    // comes from the sniffed type (never the client filename), and must agree
    // with the declared MIME family.
    const sniffedExt = sniffImageType(buffer);
    if (!sniffedExt) {
      return NextResponse.json({ success: false, data: null, error: `File ${file.name} is not a valid JPEG/PNG/WebP/GIF/AVIF image` }, { status: 415 });
    }
    const declaredFamily = file.type.replace("image/", ""); // jpeg|png|webp|gif|avif
    const sniffedFamily = sniffedExt === "jpg" ? "jpeg" : sniffedExt;
    if (declaredFamily !== sniffedFamily) {
      return NextResponse.json({ success: false, data: null, error: `File ${file.name} content does not match its declared type` }, { status: 415 });
    }

    // Random server-generated name: no traversal, no overwrite, no extension
    // under attacker control.
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${sniffedExt}`;
    await writeFile(path.join(UPLOAD_DIR, name), buffer);
    urls.push(`/uploads/${name}`);
  }

  return NextResponse.json({ success: true, data: { urls }, error: null });
}
