# ZimCast — Media Assets Requirements

> **Status:** App currently uses zero actual images. All branding is a CSS-styled `<div>Z</div>`, all icons are Lucide React SVGs, all backgrounds are CSS gradients.
> **Theme colours:** Primary `#FF416C` · Accent `#FF4B2B` · Background `#0B0B0B`

---

## HIGH PRIORITY

### 1. ZimCast Logo

| Property | Value |
|----------|-------|
| **Format** | SVG preferred (scales cleanly), PNG fallback |
| **Variants needed** | Full wordmark (icon + "ZimCast" text), icon-only |
| **Dark variant** | White/light version for use on dark backgrounds |
| **Light variant** | Dark version for og:image and potential light-mode future use |
| **Sizes** | SVG is resolution-independent; PNG fallback at 256×64 (wordmark), 64×64 (icon) |
| **Destination files** | `public/logo.svg`, `public/logo-icon.svg` |

**Where it replaces the current "Z" div:**
- `src/components/navbar.tsx` — 32×32px icon + "ZimCast" text
- `src/components/footer.tsx` — 24×24px icon + "ZimCast" text
- `src/app/(auth)/layout.tsx` — 40×40px icon + "ZimCast" text (desktop panel + mobile bar)

---

### 2. Favicon & PWA Icons

| File | Size | Format | Notes |
|------|------|--------|-------|
| `public/favicon.ico` | 16×16, 32×32, 48×48 multi-frame | ICO | **Missing entirely** — browser tab icon |
| `public/favicon-16x16.png` | 16×16 | PNG | For older browsers |
| `public/favicon-32x32.png` | 32×32 | PNG | Standard |
| `public/apple-touch-icon.png` | 180×180 | PNG | iOS home screen |
| `public/icons/icon-192.png` | 192×192 | PNG | PWA install icon (replace current placeholder) |
| `public/icons/icon-512.png` | 512×512 | PNG | PWA splash icon (replace current placeholder) |
| `public/icons/maskable-icon-512.png` | 512×512 | PNG | PWA maskable (safe zone: inner 409×409) |

**After adding icons, update `src/app/layout.tsx` metadata:**
```ts
icons: {
  icon: [
    { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
  ],
  apple: '/apple-touch-icon.png',
},
```

---

### 3. OG / Social Preview Image

| Property | Value |
|----------|-------|
| **File** | `public/og-image.png` |
| **Size** | 1200×630 px |
| **Format** | PNG or JPG |
| **Content** | ZimCast logo + tagline "Stream Live from Zimbabwe" + brand gradient background |
| **Used for** | WhatsApp/Facebook/Twitter link previews when sharing any ZimCast URL |

**After adding, update `src/app/layout.tsx` metadata:**
```ts
openGraph: {
  images: [{ url: '/og-image.png', width: 1200, height: 630 }],
},
twitter: {
  card: 'summary_large_image',
  images: ['/og-image.png'],
},
```

---

### 4. Hero Section Background (Home Page)

| Property | Value |
|----------|-------|
| **File** | `public/hero-bg.webp` |
| **Size** | 1920×1080 minimum (2400×1350 for high-DPI) |
| **Format** | WebP preferred, JPEG fallback at `public/hero-bg.jpg` |
| **Content** | Stadium / crowd / match atmosphere — dark/moody tone to blend with `#0B0B0B` theme |
| **Location** | `src/app/(app)/page.tsx` hero `<section>` as Next.js `<Image>` with `fill` + `object-cover` |

> If added: apply a `brightness(0.3)` overlay div so text remains readable over the image.

---

## MEDIUM PRIORITY

### 5. Auth Page Branding Panel Illustration

| Property | Value |
|----------|-------|
| **File** | `public/auth-illustration.png` or `.svg` |
| **Size** | 480×600 px content area (panel is 480–520px wide on desktop) |
| **Content options** | A: App mockup/screenshot on a phone · B: Stadium crowd photo (dark-toned) · C: Illustrated sports/streaming scene · D: Keep gradient-only (no change needed) |
| **Location** | `src/app/(auth)/layout.tsx` desktop left panel — overlaid on the `#FF416C → #FF4B2B` gradient |

---

### 6. ZTV / ZBC Channel Logo

| File | Size | Notes |
|------|------|-------|
| `public/ztv-logo.svg` | 120×120 px | Square icon for channel info card |
| `public/zbc-logo.svg` | 200×60 px | Horizontal wordmark for off-air screen |

**Where used:**
- `src/components/channel-info.tsx` — 48×48px logo container (replaces `Tv` Lucide icon in gradient box)
- `src/components/off-air-screen.tsx` — logo beside "Zimbabwe Broadcasting Corporation" text on off-air screen

> Use only official ZBC/ZTV branding. If unavailable, keep the current CSS icon — do not use unofficial logos.

---

### 7. Payment Provider Logos

| File | Size | Format | Notes |
|------|------|--------|-------|
| `public/ecocash-logo.png` | 120×40 px | PNG transparent bg | EcoCash brand mark |
| `public/paynow-logo.png` | 120×40 px | PNG transparent bg | Paynow brand mark |

**Where used:**
- `src/app/(app)/payment/success/page.tsx` — displayed beside "Payment Successful"
- `src/app/(app)/sports/[id]/page.tsx` — payment method selector in pass purchase flow

> Use only official logos from EcoCash / Paynow brand guidelines. White/light versions preferred for the dark UI.

---

### 8. Testimonial Avatars (Home Page)

| File | Size | Format | Person |
|------|------|--------|--------|
| `public/avatars/tatenda.jpg` | 80×80 px | JPEG or WebP | Tatenda M., Harare |
| `public/avatars/rudo.jpg` | 80×80 px | JPEG or WebP | Rudo K., Bulawayo |
| `public/avatars/tinotenda.jpg` | 80×80 px | JPEG or WebP | Tinotenda C., Mutare |

> Alternative: Use illustrated/abstract avatar placeholders instead of real photos — same file names apply.

**Location:** `src/app/(app)/page.tsx` testimonials section — add circular avatar image above or beside each reviewer name.

---

### 9. Empty State Illustrations

| File | Size | Format | Used in |
|------|------|--------|---------|
| `public/illustrations/no-matches.svg` | 200×160 px | SVG | `src/components/empty-matches.tsx` — all filter variants |
| `public/illustrations/no-passes.svg` | 200×160 px | SVG | `src/app/(app)/profile/page.tsx` passes tab |
| `public/illustrations/no-analytics.svg` | 200×160 px | SVG | `src/app/(app)/profile/page.tsx` analytics tab + `src/app/(app)/analytics/page.tsx` |

> Style: Minimal flat/line-art. Use `#FF416C` / `#FF4B2B` as accent colours. White/light lines on transparent background for dark theme compatibility.

---

## LOW PRIORITY

### 10. Payment Success Animation / Graphic

| Property | Value |
|----------|-------|
| **File** | `public/success-animation.json` (Lottie) or `public/success-graphic.svg` |
| **Size** | 160×160 px display area |
| **Content** | Checkmark burst / confetti / celebration animation |
| **Location** | `src/app/(app)/payment/success/page.tsx` — replaces the static `CheckCircle2` icon |

> If using Lottie: requires `lottie-react` package (`npm i lottie-react`).
> If using SVG: animate with Framer Motion (already installed).

---

### 11. Default User Avatar Placeholder

| File | Size | Format | Notes |
|------|------|--------|-------|
| `public/avatar-default.png` | 128×128 px | PNG or WebP | Generic silhouette or abstract avatar |

**Location:** `src/components/ui/avatar.tsx` — `AvatarImage` already supports a `src` prop; this provides a fallback before initials load or for users with no name set.

---

### 12. Video Player Poster Images

| Property | Value |
|----------|-------|
| **Format** | JPEG or WebP per match |
| **Size** | 1280×720 px (16:9) |
| **Storage** | `public/posters/[matchId].jpg` (static) or CDN URL (dynamic) |
| **Location** | `src/components/video-player.tsx` — `poster` prop exists but is never supplied by calling code |
| **Calling code** | `src/app/(app)/watch/[id]/page.tsx` — pass `poster` to `<VideoPlayer>` once available |

> Poster could be generated by compositing home/away team logos, or manually uploaded per match via the admin panel and stored on the match record.

---

## Public Folder Cleanup

The following files are Next.js boilerplate and serve no purpose in ZimCast. Safe to delete once real assets are in place:

| File | Reason |
|------|--------|
| `public/file.svg` | Next.js starter template icon |
| `public/globe.svg` | Next.js starter template icon |
| `public/next.svg` | Next.js starter template icon |
| `public/vercel.svg` | Next.js starter template icon |
| `public/window.svg` | Next.js starter template icon |

---

## Configuration Changes (When Assets Are Added)

### `next.config.ts` — External image domains

Required if using a CDN for team logos, match posters, or any externally hosted images:

```ts
images: {
  remotePatterns: [
    { protocol: 'https', hostname: 'cdn.zimcast.co.zw' },
    // add other CDN hostnames here
  ],
},
```

### Switch to `next/image` for all new assets

Replace plain `<img>` tags with Next.js `<Image>` (from `next/image`) to get:
- Automatic WebP conversion
- Lazy loading with blur placeholder
- Responsive `srcset` generation
- Cumulative Layout Shift (CLS) prevention

---

## Summary

| Priority | Asset Groups | Individual Files | Status |
|----------|-------------|-----------------|--------|
| High | Logo, Favicon set, OG image, Hero background | ~9 files | ❌ 0 complete |
| Medium | Auth illustration, ZTV/ZBC logo, Payment logos, Testimonial avatars, Empty state illustrations | ~11 files | ❌ 0 complete |
| Low | Success animation, Default avatar, Video posters | ~5 files | ❌ 0 complete |
| **Total** | **12 asset groups** | **~25 files** | **0 / 12 complete** |
