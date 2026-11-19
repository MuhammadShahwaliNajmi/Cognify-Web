/**
 * Several photos (pages of handwritten work) → one PDF, in the browser.
 * Each photo becomes one A4-wide page, re-encoded as JPEG and capped at 2000 px
 * on its longest side so phone photos don't make a huge file.
 */

const MAX_SIDE = 2000;
const PAGE_W = 595.28; // A4 width in points

async function decode(file: File): Promise<CanvasImageSource & { width: number; height: number }> {
  try {
    // honours the photo's EXIF rotation
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

async function toJpeg(file: File) {
  const img = await decode(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can't prepare photos.");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.82));
  if (!blob) throw new Error("This browser can't prepare photos.");
  return { w, h, bytes: new Uint8Array(await blob.arrayBuffer()) };
}

export const isPhoto = (f: File) => f.type.startsWith("image/") || /\.(jpe?g|png|heic|heif|webp)$/i.test(f.name);

export async function photosToPdf(files: File[], name: string): Promise<File> {
  const pages = [];
  for (const f of files) {
    try {
      pages.push(await toJpeg(f));
    } catch {
      throw new Error(`Couldn't read ${f.name}. Try a JPG or PNG photo.`);
    }
  }

  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const put = (x: string | Uint8Array) => {
    const b = typeof x === "string" ? enc.encode(x) : x;
    parts.push(b);
    length += b.length;
  };
  const obj = (n: number, ...body: (string | Uint8Array)[]) => {
    offsets[n] = length;
    put(`${n} 0 obj\n`);
    body.forEach(put);
    put("\nendobj\n");
  };

  put("%PDF-1.4\n%âãÏÓ\n");
  const pageNo = (i: number) => 3 + i * 3;
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, `<< /Type /Pages /Kids [${pages.map((_, i) => `${pageNo(i)} 0 R`).join(" ")}] /Count ${pages.length} >>`);
  pages.forEach((p, i) => {
    const n = pageNo(i);
    const W = PAGE_W;
    const H = Math.round(((PAGE_W * p.h) / p.w) * 100) / 100;
    const draw = `q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`;
    obj(n, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 ${n + 2} 0 R >> >> /Contents ${n + 1} 0 R >>`);
    obj(n + 1, `<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`);
    obj(
      n + 2,
      `<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.bytes.length} >>\nstream\n`,
      p.bytes,
      "\nendstream"
    );
  });

  const total = 2 + pages.length * 3;
  const xref = length;
  put(`xref\n0 ${total + 1}\n0000000000 65535 f \n`);
  for (let i = 1; i <= total; i++) put(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  put(`trailer\n<< /Size ${total + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  return new File(parts as BlobPart[], name, { type: "application/pdf" });
}
