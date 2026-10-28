import { createHmac, timingSafeEqual } from "node:crypto";
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Almacenamiento privado. Las subidas van directo del navegador al bucket (URL prefirmada),
// nunca pasan por las funciones del servidor.
export interface Storage {
  uploadUrl(key: string, contentType: string): Promise<string>;
  downloadUrl(key: string, fileName: string): Promise<string>; // 5 minutos
  size(key: string): Promise<number | null>; // null = no existe
  remove(key: string): Promise<void>;
}

const TTL = 300;

function s3Storage(): Storage {
  const bucket = process.env.S3_BUCKET!;
  const s3 = new S3Client({ region: process.env.S3_REGION });
  return {
    uploadUrl: (Key, ContentType) => getSignedUrl(s3, new PutObjectCommand({ Bucket: bucket, Key, ContentType }), { expiresIn: TTL }),
    downloadUrl: (Key, fileName) =>
      getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: bucket,
          Key,
          ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        }),
        { expiresIn: TTL },
      ),
    size: async (Key) => {
      try {
        return (await s3.send(new HeadObjectCommand({ Bucket: bucket, Key }))).ContentLength ?? 0;
      } catch {
        return null;
      }
    },
    remove: async (Key) => void (await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key }))),
  };
}

// ── Solo desarrollo: imita las URL prefirmadas sobre disco local (/api/dev-storage). ──

export const DEV_DIR = ".uploads";

export function devSign(key: string, exp: number) {
  return createHmac("sha256", process.env.AUTH_SECRET ?? "dev").update(`${key}:${exp}`).digest("hex");
}

export function devVerify(key: string, exp: number, sig: string) {
  const good = Buffer.from(devSign(key, exp));
  const given = Buffer.from(sig);
  return exp > Date.now() / 1000 && good.length === given.length && timingSafeEqual(good, given);
}

function devStorage(): Storage {
  const url = (key: string) => {
    const exp = Math.floor(Date.now() / 1000) + TTL;
    return `/api/dev-storage/${key}?exp=${exp}&sig=${devSign(key, exp)}`;
  };
  const path = async (key: string) => (await import("node:path")).join(process.cwd(), DEV_DIR, key);
  return {
    uploadUrl: async (key) => url(key),
    downloadUrl: async (key) => url(key),
    size: async (key) => {
      const fs = await import("node:fs/promises");
      return fs.stat(await path(key)).then((s) => s.size, () => null);
    },
    remove: async (key) => {
      const fs = await import("node:fs/promises");
      await fs.rm(await path(key), { force: true });
    },
  };
}

export const storage: Storage = process.env.S3_BUCKET
  ? s3Storage()
  : process.env.NODE_ENV !== "production"
    ? devStorage()
    : missingStorage();

// Falla al usarse, no al importarse (el build de producción importa este módulo).
function missingStorage(): Storage {
  const fail = async (): Promise<never> => {
    throw new Error("Falta S3_BUCKET: el almacenamiento local solo existe en desarrollo.");
  };
  return { uploadUrl: fail, downloadUrl: fail, size: fail, remove: fail };
}
