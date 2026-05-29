// Client-side image normalization for the rich text editor.
//
// Converts raster images to WebP and downscales oversized ones before upload,
// which cuts upload time and R2 storage. Animated GIFs and SVGs are passed
// through untouched (canvas would flatten the animation / rasterize the
// vector), and any browser that cannot encode WebP falls back to the original
// file so the upload never silently fails.

const MAX_DIMENSION = 1920;
const WEBP_QUALITY = 0.82;

const PASSTHROUGH_TYPES = new Set(["image/gif", "image/svg+xml"]);

export type WebpResult = {
    file: File;
    converted: boolean;
};

export async function convertImageToWebp(file: File): Promise<WebpResult> {
    if (!file.type.startsWith("image/") || PASSTHROUGH_TYPES.has(file.type)) {
        return { file, converted: false };
    }

    let bitmap: ImageBitmap;
    try {
        bitmap = await createImageBitmap(file);
    } catch {
        return { file, converted: false };
    }

    try {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
        const width = Math.max(1, Math.round(bitmap.width * scale));
        const height = Math.max(1, Math.round(bitmap.height * scale));

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            return { file, converted: false };
        }
        ctx.drawImage(bitmap, 0, 0, width, height);

        const blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob((result) => resolve(result), "image/webp", WEBP_QUALITY);
        });

        // toBlob returns null when the browser cannot encode WebP (older Safari).
        if (!blob || blob.type !== "image/webp") {
            return { file, converted: false };
        }

        // Skip the swap if conversion somehow produced a larger file (rare, e.g.
        // tiny already-optimized assets); keep whichever is smaller.
        if (blob.size >= file.size && file.type === "image/webp") {
            return { file, converted: false };
        }

        const webpFile = new File([blob], toWebpName(file.name), {
            type: "image/webp",
            lastModified: Date.now(),
        });
        return { file: webpFile, converted: true };
    } finally {
        bitmap.close();
    }
}

function toWebpName(original: string): string {
    const base = original.replace(/\.[^./\\]+$/, "");
    const safeBase = base.trim() || "gambar";
    return `${safeBase}.webp`;
}
