export type ThemeId = 'neutral' | 'gaming' | 'creative' | 'budget';

interface ThemeScore {
  theme: ThemeId;
  score: number;
}

const THEME_RULES: Record<Exclude<ThemeId, 'neutral'>, { keywords: string[]; patterns: RegExp[]; weight: number }> = {
  gaming: {
    keywords: ['gaming', 'game', 'fps', 'esports', 'stream', 'streaming', 'rgb', 'overclocking', 'overclock'],
    patterns: [/\b4k\b/i, /\b1440p\b/i, /\b1080p\b/i, /\b144\s*hz\b/i, /\b240\s*hz\b/i, /\brtx\b/i, /\bgtx\b/i, /\bradeon\b/i, /\bcyberpunk\b/i, /\bvalorant\b/i, /\bfortnite\b/i],
    weight: 1,
  },
  creative: {
    keywords: ['video editing', 'photo editing', 'rendering', '3d rendering', '3d modeling', 'animation', 'design', 'creative', 'workstation', 'content creation', 'music production', 'audio production', 'cad', 'architecture'],
    patterns: [/\b(davinci|premiere|after\s*effects|blender|maya|photoshop|lightroom)\b/i, /\bcolor\s*grad/i],
    weight: 1,
  },
  budget: {
    keywords: ['budget', 'cheap', 'affordable', 'value', 'economy', 'entry level', 'entry-level', 'starter', 'basic'],
    patterns: [/\bunder\s*\$?\d/i, /\b(less|below)\s*than\s*\$?\d/i, /\bcost[- ]?effective\b/i, /\bbang\s*for\s*(the\s*)?buck\b/i],
    weight: 1.2, // Slight boost for budget since price intent is strong
  },
};

export function detectTheme(prompt: string): ThemeId {
  if (!prompt || prompt.trim().length < 3) return 'neutral';

  const lower = prompt.toLowerCase();
  const scores: ThemeScore[] = [];

  for (const [theme, rules] of Object.entries(THEME_RULES) as [Exclude<ThemeId, 'neutral'>, typeof THEME_RULES[keyof typeof THEME_RULES]][]) {
    let score = 0;

    // Keyword matching
    for (const keyword of rules.keywords) {
      if (lower.includes(keyword)) {
        score += rules.weight;
      }
    }

    // Pattern matching
    for (const pattern of rules.patterns) {
      if (pattern.test(prompt)) {
        score += rules.weight;
      }
    }

    scores.push({ theme, score });
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  // Minimum threshold of 1 to avoid false positives
  if (scores[0].score >= 1) {
    return scores[0].theme;
  }

  return 'neutral';
}
