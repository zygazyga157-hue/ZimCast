# 📡 ZimCast Smart Header & System Overview

## 🔥 Header Upgrade (ZimCast v2)

### Purpose
Transform the header into:
- Navigation
- Live EPG display
- Personalization insight layer

---

## 🧩 Layout Structure

[ LOGO ] [ NAV ]        [ LIVE / CONTEXT ]        [ ACTIONS ]

---

## ⚡ Features

### 🔴 Live EPG Bar
Displays:
- Current program
- Next program
- Live indicator

Example:
📡 LIVE NOW • ZBC TV — Evening News ● LIVE  
Next: Sports Highlights

---

### 🧠 Personal Insight
Example:
“You usually watch News at this time”

---

### 📊 Smart Navigation Titles
- Home → Recommended for You  
- Live → Live Now  
- Analytics → Your Insights  

---

## 💻 Header Code

```html
<nav class="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
  <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

    <a class="flex items-center gap-2" href="/">
      <div class="gradient-accent flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white">
        Z
      </div>
      <span class="text-lg font-bold tracking-tight">ZimCast</span>
    </a>

    <div class="hidden items-center gap-1 md:flex">
      <a class="nav-link" href="/">🏠 Home</a>
      <a class="nav-link active" href="/live-tv">📺 Live TV</a>
      <a class="nav-link" href="/sports">🏆 Sports</a>
      <a class="nav-link" href="/analytics">📊 Analytics</a>
    </div>

    <div class="flex items-center gap-2">
      <button class="icon-btn">🔍</button>
      <button class="icon-btn">🔔</button>
      <button class="icon-btn rounded-full bg-muted w-8 h-8">Z</button>
    </div>
  </div>

  <div class="border-t border-border bg-background/60 px-4 py-2 text-sm">
    <div class="mx-auto flex max-w-7xl items-center justify-between">
      <div class="flex items-center gap-3">
        <span class="text-red-500 font-semibold">● LIVE</span>
        <span>ZBC TV — Evening News</span>
        <span class="text-muted-foreground">Next: Sports Highlights</span>
      </div>
      <div class="hidden md:block text-muted-foreground text-xs">
        You usually watch News at this time
      </div>
    </div>
  </div>
</nav>
```

---

## 🎨 Styling

```css
.nav-link {
  @apply flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition;
}

.nav-link.active {
  @apply text-foreground;
}

.icon-btn {
  @apply flex items-center justify-center w-9 h-9 rounded-full hover:bg-accent transition;
}
```

---

## 🔗 Backend Integration

### EPG Data
`GET /api/epg/summary`

```json
{
  "channel": "ZBCTV",
  "channelLabel": "ZTV",
  "currentProgram": {
    "id": "…",
    "title": "Evening News",
    "category": "NEWS",
    "startTime": "2026-04-02T18:00:00.000Z",
    "endTime": "2026-04-02T19:00:00.000Z",
    "match": null
  },
  "nextProgram": {
    "id": "…",
    "title": "Sports Highlights",
    "category": "SPORTS",
    "startTime": "2026-04-02T19:00:00.000Z",
    "endTime": "2026-04-02T20:00:00.000Z",
    "match": null
  },
  "ztvAvailable": true,
  "resumesAt": null,
  "blackoutMatch": null
}
```

### User Insight
`GET /api/user/insight` (requires auth)

```json
{ "message": "You usually watch News at this time." }
```

---

## 👤 Profile Menu

- Profile  
- My Analytics  
- Watch History  
- Settings  
- Admin Dashboard  
- Sign Out  

---

## 🚀 Summary

This header evolves from static navigation into:
- 📡 Live-aware
- 🧠 Personalized
- 📊 Data-driven UI
