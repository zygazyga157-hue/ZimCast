import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";
import { createProgramsBulk, type ProgramInput } from "@/lib/program";

const VALID_CATEGORIES = new Set([
  "NEWS", "SPORTS", "ENTERTAINMENT", "MUSIC", "DOCUMENTARY",
  "GAMING", "TRAVEL", "FOOD", "TECH", "FASHION", "FITNESS", "ART",
]);

/** Map free-text category strings to enum values. */
function normalizeCategory(raw: string): string {
  const upper = raw.trim().toUpperCase().replace(/\s+/g, "_");
  if (VALID_CATEGORIES.has(upper)) return upper;
  // Common aliases
  const aliases: Record<string, string> = {
    SPORT: "SPORTS", MOVIE: "ENTERTAINMENT", MOVIES: "ENTERTAINMENT",
    DRAMA: "ENTERTAINMENT", FILM: "ENTERTAINMENT", SERIES: "ENTERTAINMENT",
    SHOW: "ENTERTAINMENT", TALK: "ENTERTAINMENT", REALITY: "ENTERTAINMENT",
    KIDS: "ENTERTAINMENT", CHILDREN: "ENTERTAINMENT",
    GAME: "GAMING", GAMES: "GAMING",
    COOKING: "FOOD", CUISINE: "FOOD",
    TECHNOLOGY: "TECH", SCIENCE: "TECH",
    EXERCISE: "FITNESS", WORKOUT: "FITNESS",
    CULTURE: "ART", ARTS: "ART",
    NATURE: "DOCUMENTARY", HISTORY: "DOCUMENTARY",
  };
  return aliases[upper] || "ENTERTAINMENT";
}

// ── CSV parsing ──

function parseCSV(text: string): ProgramInput[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row");

  const headerLine = lines[0];
  const headers = headerLine.split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));

  const requiredHeaders = ["title", "starttime", "endtime"];
  for (const rh of requiredHeaders) {
    if (!headers.includes(rh) && !headers.includes(rh.replace("time", "_time"))) {
      throw new Error(`Missing required CSV column: ${rh}. Required columns: title, startTime, endTime`);
    }
  }

  // Normalize header names
  const headerMap: Record<string, string> = {};
  for (const h of headers) {
    const norm = h.replace(/_/g, "").replace(/\s/g, "");
    headerMap[h] = norm;
  }

  const programs: ProgramInput[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      const key = headerMap[headers[j]] || headers[j];
      row[key] = (values[j] || "").trim().replace(/^['"]+|['"]+$/g, "");
    }

    programs.push({
      title: row.title || "",
      channel: row.channel || "ZBCTV",
      category: row.category ? normalizeCategory(row.category) : "ENTERTAINMENT",
      description: row.description || null,
      startTime: new Date(row.starttime),
      endTime: new Date(row.endtime),
      blackout: row.blackout === "true" || row.blackout === "1" || row.blackout === "yes",
    });
  }

  return programs;
}

/** Parse a single CSV line, respecting quoted fields with commas. */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' || ch === "'") {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ── XMLTV parsing ──

function parseXMLTV(text: string): ProgramInput[] {
  // Simple DOM-free XMLTV parser using regex for <programme> elements.
  // This avoids needing a full XML parser dependency.
  const programs: ProgramInput[] = [];
  const programmeRegex = /<programme\s+([^>]*)>([\s\S]*?)<\/programme>/gi;
  let match: RegExpExecArray | null;

  while ((match = programmeRegex.exec(text)) !== null) {
    const attrs = match[1];
    const body = match[2];

    const startAttr = /start="([^"]+)"/.exec(attrs)?.[1];
    const stopAttr = /stop="([^"]+)"/.exec(attrs)?.[1];
    const channelAttr = /channel="([^"]+)"/.exec(attrs)?.[1];

    const title = /<title[^>]*>([^<]+)<\/title>/i.exec(body)?.[1]?.trim() || "";
    const desc = /<desc[^>]*>([^<]+)<\/desc>/i.exec(body)?.[1]?.trim() || null;
    const category = /<category[^>]*>([^<]+)<\/category>/i.exec(body)?.[1]?.trim() || "";

    if (!title || !startAttr || !stopAttr) continue;

    programs.push({
      title,
      description: desc,
      channel: channelAttr || "ZBCTV",
      category: category ? normalizeCategory(category) : "ENTERTAINMENT",
      startTime: parseXMLTVDate(startAttr),
      endTime: parseXMLTVDate(stopAttr),
      blackout: false,
    });
  }

  return programs;
}

/** Parse XMLTV date format: 20260331180000 +0200 → Date */
function parseXMLTVDate(s: string): Date {
  const cleaned = s.replace(/\s+/g, "");
  // Format: YYYYMMDDHHmmss[+/-]HHMM
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})([+-]\d{4})?$/.exec(cleaned);
  if (m) {
    const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${m[7] ? m[7].slice(0, 3) + ":" + m[7].slice(3) : "Z"}`;
    return new Date(iso);
  }
  // Fallback to native parsing
  return new Date(s);
}

// ── Route handler ──

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const contentType = req.headers.get("content-type") || "";
    let inputs: ProgramInput[];

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
      }

      const text = await file.text();
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith(".xml") || fileName.endsWith(".xmltv")) {
        inputs = parseXMLTV(text);
      } else {
        // Default to CSV (.csv or any other extension)
        inputs = parseCSV(text);
      }
    } else {
      // JSON body with { format, content }
      const body = await req.json();
      const { format, content } = body;
      if (!content) {
        return NextResponse.json({ error: "Request body must include 'content' string" }, { status: 400 });
      }

      if (format === "xmltv" || format === "xml") {
        inputs = parseXMLTV(content);
      } else {
        inputs = parseCSV(content);
      }
    }

    if (inputs.length === 0) {
      return NextResponse.json({ error: "No programs found in the uploaded file" }, { status: 400 });
    }

    const result = await createProgramsBulk(inputs);

    const status = result.errors.length > 0 ? 422 : 201;
    return NextResponse.json(result, { status });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("CSV must have") || error instanceof Error && error.message.startsWith("Missing required")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return handleApiError(error, "Program import error");
  }
}
