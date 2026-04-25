#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function loadDotEnvIfNeeded() {
  if (process.env.STREAM_TOKEN_SECRET) return;
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

function base64UrlFromBuffer(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlFromString(str) {
  return base64UrlFromBuffer(Buffer.from(str, 'utf8'));
}

function parseArgs() {
  const argv = process.argv.slice(2);
  const out = { userId: 'localtest', streamKey: 'demo_match_01', expiry: 3600 };
  if (argv.length === 0) return out;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') { out._help = true; break; }
    if (a === '--user' || a === '-u') { out.userId = argv[++i]; continue; }
    if (a === '--key' || a === '-k') { out.streamKey = argv[++i]; continue; }
    if (a === '--expiry' || a === '-e') { out.expiry = Number(argv[++i]); continue; }
    // positional
    if (!out._pos0) { out.streamKey = a; out._pos0 = true; continue; }
  }
  return out;
}

function usage() {
  console.log('Usage: node scripts/gen-stream-token.js [streamKey] [--user userId] [--expiry seconds]');
  console.log('Example: node scripts/gen-stream-token.js demo_match_01 --user alice --expiry 3600');
}

function generateToken(secret, userId, pathKey, expiresInSeconds) {
  const exp = Math.floor(Date.now() / 1000) + Number(expiresInSeconds);
  const payload = { userId, path: pathKey, exp };
  const data = base64UrlFromString(JSON.stringify(payload));
  const sig = base64UrlFromBuffer(crypto.createHmac('sha256', secret).update(data).digest());
  return `${data}.${sig}`;
}

(function main(){
  loadDotEnvIfNeeded();
  const args = parseArgs();
  if (args._help) { usage(); process.exit(0); }

  const secret = process.env.STREAM_TOKEN_SECRET;
  if (!secret) {
    console.error('STREAM_TOKEN_SECRET not found in environment or .env');
    process.exit(2);
  }

  const token = generateToken(secret, args.userId, args.streamKey, args.expiry);
  console.log(token);
})();
