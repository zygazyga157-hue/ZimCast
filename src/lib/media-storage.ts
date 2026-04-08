import crypto from "crypto";
import { AppError } from "@/lib/errors";

export type MediaKind = "avatar" | "banner";

export const ALLOWED_IMAGE_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
] as const);

export type AllowedImageContentType =
  | "image/jpeg"
  | "image/png"
  | "image/webp";

export function isAllowedImageContentType(
  contentType: unknown,
): contentType is AllowedImageContentType {
  return typeof contentType === "string" && ALLOWED_IMAGE_CONTENT_TYPES.has(contentType as AllowedImageContentType);
}

export function publicUrlForKey(key?: string | null): string | null {
  if (!key) return null;
  const base = (process.env.MEDIA_PUBLIC_BASE_URL ?? "").trim().replace(/\/+$/, "");
  if (!base) return null;
  return `${base}/${key}`;
}

function extensionForContentType(contentType: AllowedImageContentType): string {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/png") return "png";
  return "webp";
}

export function buildUserMediaKey(args: {
  userId: string;
  kind: MediaKind;
  contentType: AllowedImageContentType;
  id?: string;
}): string {
  const id = args.id ?? crypto.randomUUID();
  const ext = extensionForContentType(args.contentType);
  return `user-media/${args.userId}/${args.kind}/${id}.${ext}`;
}

type MediaStorageConfig = {
  endpoint: string | null;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
};

function getMediaStorageConfig(): MediaStorageConfig {
  const bucket = (process.env.MEDIA_S3_BUCKET ?? "").trim();
  const accessKeyId = (process.env.MEDIA_S3_ACCESS_KEY_ID ?? "").trim();
  const secretAccessKey = (process.env.MEDIA_S3_SECRET_ACCESS_KEY ?? "").trim();
  const region = (process.env.MEDIA_S3_REGION ?? "auto").trim();
  const endpoint = (process.env.MEDIA_S3_ENDPOINT ?? "").trim();

  if (!bucket || !accessKeyId || !secretAccessKey) {
    throw new AppError(
      500,
      "MEDIA_NOT_CONFIGURED",
      "Media storage is not configured (missing MEDIA_S3_* env vars).",
    );
  }

  return {
    endpoint: endpoint ? endpoint.replace(/\/+$/, "") : null,
    region,
    bucket,
    accessKeyId,
    secretAccessKey,
  };
}

function encodeRfc3986(input: string): string {
  return encodeURIComponent(input).replace(/[!'()*]/g, (c) =>
    `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function sha256Hex(data: string | Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

function toAmzDate(now: Date): { amzDate: string; dateStamp: string } {
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const hh = String(now.getUTCHours()).padStart(2, "0");
  const mi = String(now.getUTCMinutes()).padStart(2, "0");
  const ss = String(now.getUTCSeconds()).padStart(2, "0");
  return {
    amzDate: `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`,
    dateStamp: `${yyyy}${mm}${dd}`,
  };
}

function getSigningKey(args: {
  secretAccessKey: string;
  dateStamp: string;
  region: string;
  service: string;
}): Buffer {
  const kDate = hmacSha256(`AWS4${args.secretAccessKey}`, args.dateStamp);
  const kRegion = hmacSha256(kDate, args.region);
  const kService = hmacSha256(kRegion, args.service);
  return hmacSha256(kService, "aws4_request");
}

function canonicalizePath(pathname: string): string {
  return pathname
    .split("/")
    .map((seg) => encodeRfc3986(decodeURIComponent(seg)))
    .join("/");
}

function canonicalizeQuery(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map((k) => `${encodeRfc3986(k)}=${encodeRfc3986(params[k])}`)
    .join("&");
}

function buildS3UrlForKey(cfg: MediaStorageConfig, key: string): URL {
  if (cfg.endpoint) {
    const base = new URL(cfg.endpoint);
    const basePath = base.pathname.replace(/\/+$/, "");
    base.pathname = `${basePath}/${cfg.bucket}/${key}`;
    return base;
  }

  // AWS S3 (virtual-hosted style)
  const url = new URL(`https://${cfg.bucket}.s3.${cfg.region}.amazonaws.com/`);
  url.pathname = `/${key}`;
  return url;
}

export async function presignPutObject(args: {
  key: string;
  contentType: AllowedImageContentType;
  expiresSeconds?: number;
}): Promise<{ uploadUrl: string; publicUrl: string | null }> {
  const cfg = getMediaStorageConfig();
  const url = buildS3UrlForKey(cfg, args.key);
  const { amzDate, dateStamp } = toAmzDate(new Date());

  const service = "s3";
  const credentialScope = `${dateStamp}/${cfg.region}/${service}/aws4_request`;

  const signedHeaders = "content-type;host";
  const query: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${cfg.accessKeyId}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(args.expiresSeconds ?? 300),
    "X-Amz-SignedHeaders": signedHeaders,
  };

  const canonicalQueryString = canonicalizeQuery(query);
  const canonicalUri = canonicalizePath(url.pathname);
  const canonicalHeaders = `content-type:${args.contentType}\nhost:${url.host}\n`;

  const canonicalRequest = [
    "PUT",
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = getSigningKey({
    secretAccessKey: cfg.secretAccessKey,
    dateStamp,
    region: cfg.region,
    service,
  });

  const signature = crypto
    .createHmac("sha256", signingKey)
    .update(stringToSign, "utf8")
    .digest("hex");

  const finalUrl = new URL(url.toString());
  for (const [k, v] of Object.entries(query)) {
    finalUrl.searchParams.set(k, v);
  }
  finalUrl.searchParams.set("X-Amz-Signature", signature);

  return {
    uploadUrl: finalUrl.toString(),
    publicUrl: publicUrlForKey(args.key),
  };
}

async function signedS3Fetch(args: {
  method: "HEAD" | "DELETE";
  key: string;
}): Promise<Response> {
  const cfg = getMediaStorageConfig();
  const url = buildS3UrlForKey(cfg, args.key);
  const { amzDate, dateStamp } = toAmzDate(new Date());

  const service = "s3";
  const credentialScope = `${dateStamp}/${cfg.region}/${service}/aws4_request`;
  const payloadHash = sha256Hex("");

  const headers: Record<string, string> = {
    "x-amz-date": amzDate,
    "x-amz-content-sha256": payloadHash,
  };

  const signedHeaders = ["host", ...Object.keys(headers)].sort().join(";");
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((h) => `${h}:${headers[h].trim()}\n`)
    .join("");

  const canonicalRequest = [
    args.method,
    canonicalizePath(url.pathname),
    "", // no query
    `host:${url.host}\n${canonicalHeaders}`,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = getSigningKey({
    secretAccessKey: cfg.secretAccessKey,
    dateStamp,
    region: cfg.region,
    service,
  });

  const signature = crypto
    .createHmac("sha256", signingKey)
    .update(stringToSign, "utf8")
    .digest("hex");

  const authorization = `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return fetch(url.toString(), {
    method: args.method,
    headers: {
      ...headers,
      Authorization: authorization,
    },
  });
}

export async function headObject(key: string): Promise<{
  contentType: string | null;
  contentLength: number | null;
}> {
  const res = await signedS3Fetch({ method: "HEAD", key });
  if (!res.ok) {
    throw new AppError(
      400,
      "MEDIA_OBJECT_NOT_FOUND",
      "Uploaded file was not found in storage. Please try again.",
    );
  }

  const contentType = res.headers.get("content-type");
  const lengthStr = res.headers.get("content-length");
  const contentLength =
    typeof lengthStr === "string" && lengthStr.trim()
      ? Number(lengthStr)
      : null;

  return {
    contentType,
    contentLength: Number.isFinite(contentLength) ? contentLength : null,
  };
}

export async function deleteObject(key: string): Promise<void> {
  try {
    const res = await signedS3Fetch({ method: "DELETE", key });
    // Best effort: ignore failures (object may already be gone)
    void res;
  } catch {
    // ignore
  }
}
