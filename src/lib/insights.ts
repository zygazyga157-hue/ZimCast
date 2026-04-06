interface AnalyticsData {
  totalWatchTime: number;
  favoriteCategory: string | null;
  categoryBreakdown: Record<string, number>;
  peakTime: number | null;
  weeklyHeatmap: number[][];
  totalMatches: number;
}

export function generateInsights(data: AnalyticsData): string[] {
  const insights: string[] = [];

  if (data.totalWatchTime === 0) return insights;

  if (data.favoriteCategory) {
    const totalMinutes = Object.values(data.categoryBreakdown).reduce((a, b) => a + b, 0);
    const favMinutes = data.categoryBreakdown[data.favoriteCategory] ?? 0;
    const pct = totalMinutes > 0 ? Math.round((favMinutes / totalMinutes) * 100) : 0;
    if (pct > 50) {
      insights.push(`You watch mostly ${data.favoriteCategory.toLowerCase()} content (${pct}% of your time).`);
    } else if (pct > 30) {
      insights.push(`${data.favoriteCategory.toLowerCase().replace(/^./, c => c.toUpperCase())} is your go-to category at ${pct}% of viewing time.`);
    }
  }

  // Peak time
  if (data.peakTime !== null) {
    const hour = data.peakTime;
    const period =
      hour < 6 ? "night owl" :
      hour < 12 ? "morning" :
      hour < 17 ? "afternoon" :
      hour < 21 ? "evening" : "night";
    const timeStr = `${hour.toString().padStart(2, "0")}:00`;
    insights.push(`Your peak viewing time is ${timeStr} — you're a${period === "afternoon" || period === "evening" ? "n" : ""} ${period} viewer.`);
  }

  // Total matches
  if (data.totalMatches > 0) {
    insights.push(`You've watched ${data.totalMatches} live match${data.totalMatches !== 1 ? "es" : ""} this month.`);
  }

  // Watch time milestone
  const hours = Math.floor(data.totalWatchTime / 3600);
  if (hours >= 10) {
    insights.push(`You've clocked ${hours} hours of streaming — dedicated viewer!`);
  } else if (hours >= 1) {
    insights.push(`You've watched ${hours} hour${hours !== 1 ? "s" : ""} of content so far.`);
  }

  // Category they haven't watched
  const allCategories = ["SPORTS", "NEWS", "ENTERTAINMENT", "MUSIC", "DOCUMENTARY", "GAMING", "TRAVEL", "FOOD", "TECH", "FASHION", "FITNESS", "ART"];
  const unwatched = allCategories.filter(
    (c) => !data.categoryBreakdown[c] || data.categoryBreakdown[c] === 0
  );
  if (unwatched.length > 0 && unwatched.length < allCategories.length) {
    const suggestion = unwatched[Math.floor(Math.random() * unwatched.length)];
    insights.push(`Try ${suggestion.toLowerCase()} — expand your viewing horizons!`);
  }

  return insights;
}
