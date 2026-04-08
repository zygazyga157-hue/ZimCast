"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  1992 AFCON Qualifier — Zimbabwe 4-1 South Africa                   */
/*  16 August 1992, National Sports Stadium, Harare                    */
/* ------------------------------------------------------------------ */

type XY = [number, number];

interface Phase {
  minute: number;
  zimScore: number;
  saScore: number;
  zim: XY[];
  sa: XY[];
  ball: XY;
  caption?: string;
}

/*
 * Zimbabwe "Dream Team" 4-4-2 (indices 0-10):
 * 0:GK Grobbelaar, 1:LB Sibanda, 2:CB McKop, 3:CB Shonhayi(c), 4:RB Chawanda,
 * 5:LM Nkiwane, 6:CM Gumbo, 7:CM W.Khumalo, 8:ST P.Ndlovu, 9:ST A.Ndlovu, 10:RM Takawira
 *
 * South Africa 4-4-2 (indices 0-10):
 * 0:GK Anderson, 1:RB Radebe, 2:CB Tovey(c), 3:CB Komphela, 4:LB Nyathi,
 * 5:CM Khuse, 6:LM Legodi, 7:CM D.Khumalo, 8:ST MacGregor, 9:ST Masinga, 10:RM Kambule
 */

const ZIM_NUMS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const SA_NUMS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

const PHASE_MS = 3500;

/* ── Match phases ── */
const PHASES: Phase[] = [
  /* 0 — Kickoff */
  {
    minute: 0,
    zimScore: 0,
    saScore: 0,
    zim: [[240,42],[100,110],[190,110],[290,110],[380,110],[100,195],[200,195],[280,195],[200,265],[280,265],[380,195]],
    sa:  [[240,538],[380,470],[290,470],[190,470],[100,470],[200,390],[100,390],[280,390],[200,320],[280,320],[380,390]],
    ball: [240, 290],
  },
  /* 1 — Zimbabwe pressing (15') */
  {
    minute: 15,
    zimScore: 0,
    saScore: 0,
    zim: [[240,44],[105,125],[195,120],[285,120],[375,125],[105,215],[210,220],[275,215],[215,285],[270,290],[370,210]],
    sa:  [[240,538],[375,480],[285,485],[195,485],[105,480],[205,405],[105,400],[275,405],[210,340],[275,335],[375,400]],
    ball: [255, 330],
  },
  /* 2 — GOAL: Takawira #11 (34') → 1-0 */
  {
    minute: 34,
    zimScore: 1,
    saScore: 0,
    zim: [[240,44],[110,135],[195,125],[285,125],[370,130],[110,225],[215,235],[270,230],[215,310],[275,305],[350,440]],
    sa:  [[240,538],[370,490],[280,500],[200,500],[110,490],[210,420],[110,415],[280,415],[215,350],[270,345],[370,415]],
    ball: [310, 530],
    caption: "34\u2032 Takawira! 1-0",
  },
  /* 3 — Second half restart (45') */
  {
    minute: 45,
    zimScore: 1,
    saScore: 0,
    zim: [[240,42],[100,112],[192,112],[288,112],[380,112],[100,198],[202,198],[278,198],[205,270],[275,270],[380,198]],
    sa:  [[240,538],[378,468],[288,468],[192,468],[102,468],[198,388],[102,388],[278,388],[198,318],[278,318],[378,388]],
    ball: [240, 292],
  },
  /* 4 — GOAL: Masinga #10 (52') → 1-1 */
  {
    minute: 52,
    zimScore: 1,
    saScore: 1,
    zim: [[240,42],[105,100],[192,95],[288,95],[375,100],[105,180],[202,178],[278,182],[210,248],[275,252],[375,178]],
    sa:  [[240,538],[365,450],[275,445],[205,445],[115,450],[205,365],[115,355],[275,360],[235,275],[255,110],[365,360]],
    ball: [240, 35],
    caption: "52\u2032 Masinga equalises! 1-1",
  },
  /* 5 — GOAL: Gumbo #7 (63') → 2-1 */
  {
    minute: 63,
    zimScore: 2,
    saScore: 1,
    zim: [[240,45],[105,128],[195,122],[285,122],[375,128],[110,218],[245,425],[272,232],[212,315],[295,305],[365,222]],
    sa:  [[240,538],[372,492],[282,498],[198,498],[108,492],[208,418],[108,412],[282,415],[212,342],[272,338],[372,415]],
    ball: [248, 530],
    caption: "63\u2032 Gumbo! 2-1",
  },
  /* 6 — GOAL: A.Ndlovu #10 (78') → 3-1 */
  {
    minute: 78,
    zimScore: 3,
    saScore: 1,
    zim: [[240,48],[108,132],[198,126],[282,126],[372,132],[108,222],[205,235],[275,228],[218,318],[275,445],[368,218]],
    sa:  [[240,538],[368,495],[278,502],[202,502],[112,495],[205,425],[112,418],[278,422],[218,348],[268,342],[368,418]],
    ball: [268, 530],
    caption: "78\u2032 A.Ndlovu! 3-1",
  },
  /* 7 — GOAL: P.Ndlovu #9 solo (88') → 4-1 "Sunkuzonke!" */
  {
    minute: 88,
    zimScore: 4,
    saScore: 1,
    zim: [[240,50],[105,138],[195,130],[285,130],[375,138],[105,228],[210,242],[268,238],[248,465],[295,312],[362,225]],
    sa:  [[240,538],[345,488],[278,505],[202,505],[115,492],[210,428],[115,422],[278,428],[225,355],[268,348],[365,422]],
    ball: [248, 530],
    caption: "88\u2032 P.Ndlovu \u2014 Sunkuzonke! 4-1",
  },
  /* 8 — Full Time (90') — celebration */
  {
    minute: 90,
    zimScore: 4,
    saScore: 1,
    zim: [[225,278],[210,298],[235,268],[255,288],[240,305],[218,282],[245,272],[265,295],[240,258],[252,280],[228,292]],
    sa:  [[240,538],[355,498],[282,508],[198,508],[128,498],[218,438],[138,428],[298,438],[228,378],[268,378],[365,428]],
    ball: [240, 262],
    caption: "Full Time: Zimbabwe 4-1 South Africa",
  },
];

/* ── Team colours ── */
const ZIM_FILL = "#1B5E20";
const ZIM_GK_FILL = "#FFD700";
const ZIM_TEXT = "#FFD700";
const ZIM_GK_TEXT = "#1B5E20";

const SA_FILL = "#FFD700";
const SA_GK_FILL = "#006400";
const SA_TEXT = "#006400";
const SA_GK_TEXT = "#FFD700";

const FONT = "Inter,system-ui,sans-serif";

export function MatchSimulation() {
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState(false);

  /* Start when scrolled into view */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setStarted(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  /* Phase timer */
  useEffect(() => {
    if (!started || done) return;
    if (idx >= PHASES.length - 1) {
      const finish = setTimeout(() => setDone(true), 0);
      return () => clearTimeout(finish);
    }
    const t = setTimeout(() => setIdx((i) => i + 1), PHASE_MS);
    return () => clearTimeout(t);
  }, [idx, done, started]);

  const replay = () => {
    setIdx(0);
    setDone(false);
  };

  const phase = PHASES[idx];

  return (
    <div ref={ref} className="w-full max-w-120">
      {/* ── Scoreboard ── */}
      <div className="mb-3 overflow-hidden rounded-xl border border-border bg-black/70 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#1B5E20] ring-1 ring-[#FFD700]/40" />
            <span className="text-xs font-bold tracking-wide sm:text-sm">
              ZIM
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <motion.span
              key={`zs-${phase.zimScore}`}
              initial={{ scale: 1.5, color: "#FFD700" }}
              animate={{ scale: 1, color: "#ffffff" }}
              transition={{ duration: 0.5 }}
              className="text-xl font-extrabold tabular-nums sm:text-2xl"
            >
              {phase.zimScore}
            </motion.span>
            <span className="text-base text-muted-foreground">&ndash;</span>
            <motion.span
              key={`ss-${phase.saScore}`}
              initial={{ scale: 1.5, color: "#FFD700" }}
              animate={{ scale: 1, color: "#ffffff" }}
              transition={{ duration: 0.5 }}
              className="text-xl font-extrabold tabular-nums sm:text-2xl"
            >
              {phase.saScore}
            </motion.span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-wide sm:text-sm">
              RSA
            </span>
            <span className="h-3 w-3 rounded-full bg-[#FFD700] ring-1 ring-[#006400]/40" />
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-border/40 bg-black/40 px-4 py-1 text-[10px] text-muted-foreground">
          <span>16 Aug 1992 &middot; AFCON Qualifier</span>
          <span className="font-mono font-bold text-primary">
            {phase.minute}&apos;
          </span>
        </div>
        <div className="h-0.5 bg-border/20">
          <motion.div
            className="h-full bg-primary/60"
            animate={{ width: `${(phase.minute / 90) * 100}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* ── Pitch ── */}
      <div className="relative">
        <svg
          className="w-full"
          viewBox="0 0 480 580"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <filter
              id="bGlow"
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
            >
              <feGaussianBlur
                in="SourceGraphic"
                stdDeviation="4"
                result="b"
              />
              <feColorMatrix
                in="b"
                type="matrix"
                values="1 0 0 0 0.9  1 0 0 0 0.8  0.5 0 0 0 0  0 0 0 0.5 0"
                result="g"
              />
              <feMerge>
                <feMergeNode in="g" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Pitch surface */}
          <rect
            x="20"
            y="20"
            width="440"
            height="540"
            rx="10"
            fill="#0d2a1a"
          />
          <rect
            x="20"
            y="20"
            width="440"
            height="540"
            rx="10"
            fill="none"
            stroke="#1f4f30"
            strokeWidth="2.5"
          />

          {/* Grass stripes */}
          {[20, 128, 236, 344, 452].map((y) => (
            <rect
              key={y}
              x="20"
              y={y}
              width="440"
              height="54"
              fill="#0f3320"
            />
          ))}

          {/* Halfway line + centre circle */}
          <line
            x1="20"
            y1="290"
            x2="460"
            y2="290"
            stroke="#2a8040"
            strokeWidth="2"
          />
          <circle
            cx="240"
            cy="290"
            r="65"
            fill="none"
            stroke="#2a8040"
            strokeWidth="2"
          />
          <circle cx="240" cy="290" r="3" fill="#2a8040" />

          {/* Top penalty area */}
          <rect
            x="130"
            y="20"
            width="220"
            height="80"
            fill="none"
            stroke="#2a8040"
            strokeWidth="2"
          />
          <rect
            x="175"
            y="20"
            width="130"
            height="44"
            fill="none"
            stroke="#2a8040"
            strokeWidth="2"
          />
          <rect
            x="200"
            y="14"
            width="80"
            height="12"
            rx="2"
            fill="#1a5030"
            stroke="#aaa"
            strokeWidth="1.5"
          />

          {/* Bottom penalty area */}
          <rect
            x="130"
            y="460"
            width="220"
            height="80"
            fill="none"
            stroke="#2a8040"
            strokeWidth="2"
          />
          <rect
            x="175"
            y="496"
            width="130"
            height="44"
            fill="none"
            stroke="#2a8040"
            strokeWidth="2"
          />
          <rect
            x="200"
            y="554"
            width="80"
            height="12"
            rx="2"
            fill="#1a5030"
            stroke="#aaa"
            strokeWidth="1.5"
          />

          {/* Corner arcs */}
          <path
            d="M20 40 A16 16 0 0 1 36 24"
            fill="none"
            stroke="#2a8040"
            strokeWidth="1.5"
          />
          <path
            d="M444 24 A16 16 0 0 1 460 40"
            fill="none"
            stroke="#2a8040"
            strokeWidth="1.5"
          />
          <path
            d="M20 540 A16 16 0 0 0 36 556"
            fill="none"
            stroke="#2a8040"
            strokeWidth="1.5"
          />
          <path
            d="M444 556 A16 16 0 0 0 460 540"
            fill="none"
            stroke="#2a8040"
            strokeWidth="1.5"
          />

          {/* Penalty spots + arcs */}
          <circle cx="240" cy="80" r="3" fill="#2a8040" />
          <circle cx="240" cy="500" r="3" fill="#2a8040" />
          <path
            d="M175 100 A65 65 0 0 1 305 100"
            fill="none"
            stroke="#2a8040"
            strokeWidth="2"
          />
          <path
            d="M175 460 A65 65 0 0 0 305 460"
            fill="none"
            stroke="#2a8040"
            strokeWidth="2"
          />

          {/* ── Zimbabwe players ── */}
          {ZIM_NUMS.map((num, i) => {
            const [cx, cy] = phase.zim[i];
            const gk = i === 0;
            return (
              <g key={`z${i}`}>
                <motion.circle
                  initial={{ cx, cy }}
                  animate={{ cx, cy }}
                  transition={{ duration: 2, ease: "easeInOut" }}
                  r={gk ? 10 : 8}
                  fill={gk ? ZIM_GK_FILL : ZIM_FILL}
                  stroke="#0d2a1a"
                  strokeWidth={2}
                />
                <motion.text
                  initial={{ x: cx, y: cy + 4 }}
                  animate={{ x: cx, y: cy + 4 }}
                  transition={{ duration: 2, ease: "easeInOut" }}
                  fill={gk ? ZIM_GK_TEXT : ZIM_TEXT}
                  textAnchor="middle"
                  fontSize={gk ? 10 : 8}
                  fontWeight={700}
                  fontFamily={FONT}
                >
                  {num}
                </motion.text>
              </g>
            );
          })}

          {/* ── South Africa players ── */}
          {SA_NUMS.map((num, i) => {
            const [cx, cy] = phase.sa[i];
            const gk = i === 0;
            return (
              <g key={`s${i}`}>
                <motion.circle
                  initial={{ cx, cy }}
                  animate={{ cx, cy }}
                  transition={{ duration: 2, ease: "easeInOut" }}
                  r={gk ? 10 : 8}
                  fill={gk ? SA_GK_FILL : SA_FILL}
                  stroke="#0d2a1a"
                  strokeWidth={2}
                />
                <motion.text
                  initial={{ x: cx, y: cy + 4 }}
                  animate={{ x: cx, y: cy + 4 }}
                  transition={{ duration: 2, ease: "easeInOut" }}
                  fill={gk ? SA_GK_TEXT : SA_TEXT}
                  textAnchor="middle"
                  fontSize={gk ? 10 : 8}
                  fontWeight={700}
                  fontFamily={FONT}
                >
                  {num}
                </motion.text>
              </g>
            );
          })}

          {/* ── Ball ── */}
          <motion.circle
            initial={{ cx: phase.ball[0], cy: phase.ball[1] }}
            animate={{ cx: phase.ball[0], cy: phase.ball[1] }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            r={7}
            fill="#fff"
            stroke="#333"
            strokeWidth={1.5}
            filter="url(#bGlow)"
          />
        </svg>

        {/* ── Caption overlay ── */}
        <AnimatePresence mode="wait">
          {phase.caption && (
            <motion.div
              key={`c-${idx}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute bottom-[6%] left-1/2 -translate-x-1/2"
            >
              <span className="whitespace-nowrap rounded-full bg-black/85 px-4 py-1.5 text-[11px] font-bold text-[#FFD700] ring-1 ring-[#FFD700]/25 backdrop-blur-sm sm:text-sm">
                {phase.caption}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Replay ── */}
      <AnimatePresence>
        {done && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 flex justify-center"
          >
            <button
              onClick={replay}
              className="flex items-center gap-2 rounded-full border border-border bg-card/80 px-5 py-2 text-sm font-medium transition-colors hover:border-primary/50 hover:text-primary"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Replay Match
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
