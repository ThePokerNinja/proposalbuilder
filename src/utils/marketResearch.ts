export interface MarketResearchMetrics {
  competitiveIntensity: number; // 0-100
  differentiationOpportunity: number; // 0-100
  uxElevationNeeded: number; // 0-100
  timelinePressure: number; // 0-100
}

export interface MarketResearchResult {
  marketSummary: string;
  competitiveLandscape: string;
  bestPractices: string;
  strategicRecommendations: string;
  metrics: MarketResearchMetrics;
}

// Intelligent market research that analyzes project context dynamically
// In a future iteration this can call a real AI/search API.
export function runMarketResearch(
  projectName: string,
  projectSummary: string,
  projectCategory?: string,
  projectPriorityLabel?: string,
  jobTitle?: string
): MarketResearchResult {
  const name = projectName || 'this initiative';
  const summary = projectSummary || '';
  const category = projectCategory || 'digital experience';
  const priority = projectPriorityLabel || '';
  const title = jobTitle || '';

  // Intelligent market positioning based on category and context
  const categoryInsights: Record<string, { market: string; trends: string[]; focus: string }> = {
    'branding package': {
      market: 'brand identity and visual design',
      trends: ['minimalist design systems', 'sustainable brand narratives', 'cross-platform consistency', 'authentic storytelling'],
      focus: 'visual differentiation and brand coherence'
    },
    'social media': {
      market: 'social media strategy and content creation',
      trends: ['short-form video content', 'authentic engagement', 'community building', 'platform-specific optimization'],
      focus: 'engagement and community growth'
    },
    'motion graphics/video': {
      market: 'video production and motion design',
      trends: ['cinematic storytelling', 'accessible video formats', 'interactive video experiences', 'performance-optimized delivery'],
      focus: 'narrative impact and technical excellence'
    },
    'mobile site': {
      market: 'mobile-first web experiences',
      trends: ['progressive web apps', 'touch-optimized interactions', 'offline functionality', 'app-like performance'],
      focus: 'mobile performance and user experience'
    },
    'pitch deck': {
      market: 'presentation design and storytelling',
      trends: ['data-driven narratives', 'interactive presentations', 'visual hierarchy', 'compelling storytelling'],
      focus: 'persuasive communication and clarity'
    },
    'mobile app': {
      market: 'native and cross-platform mobile applications',
      trends: ['native performance', 'intuitive navigation', 'offline-first architecture', 'seamless onboarding'],
      focus: 'user experience and technical architecture'
    },
    'plugin': {
      market: 'software extensions and integrations',
      trends: ['developer experience', 'API-first design', 'modular architecture', 'documentation quality'],
      focus: 'technical excellence and developer adoption'
    }
  };

  const insights = categoryInsights[category.toLowerCase()] || {
    market: 'digital experience',
    trends: ['user-centered design', 'performance optimization', 'accessibility', 'scalable architecture'],
    focus: 'user experience and business outcomes'
  };

  // Dynamic market summary based on all inputs
  const marketContext = title 
    ? `As a ${title}, you're leading a ${category} initiative`
    : `This ${category} initiative`;
  
  const summaryContext = summary 
    ? ` Your project goals—${summary.substring(0, 150)}${summary.length > 150 ? '...' : ''}—indicate a focus on ${insights.focus}.`
    : '';
  
  const priorityContext = priority === 'urgent'
    ? ' Given the urgent timeline, the market demands rapid iteration and clear prioritization to maintain quality while meeting deadlines.'
    : priority === 'within-month'
    ? ' With a timeline within the month, there\'s opportunity to balance thorough planning with efficient execution.'
    : priority === 'no rush'
    ? ' The extended timeline allows for deeper research, validation, and strategic refinement.'
    : '';

  const marketSummary = `${marketContext} operating in the ${insights.market} space. Current market trends emphasize ${insights.trends.slice(0, 2).join(' and ')}, with leading players investing heavily in ${insights.focus}.${summaryContext}${priorityContext}`;

  // Dynamic competitive landscape based on category
  const competitiveLandscape = `The competitive landscape for ${category} is characterized by ${category === 'social media' ? 'highly saturated platforms where differentiation requires authentic voice and strategic content planning' : category === 'mobile app' ? 'intense competition where user experience and performance are table stakes' : category === 'branding package' ? 'brands seeking to establish unique visual identities that resonate across touchpoints' : 'organizations prioritizing user experience, clear positioning, and measurable outcomes'}. Leading competitors typically deploy ${category === 'mobile app' || category === 'mobile site' ? 'fast, responsive interfaces with intuitive navigation' : category === 'social media' ? 'consistent visual systems and engaging content strategies' : 'opinionated visual systems, clear narrative frameworks, and modular design systems'}. Success in this space requires ${insights.focus}, ${insights.trends[0]}, and ${insights.trends[1]}.`;

  // Category-specific best practices
  const bestPractices = `Best practices for ${category} work in 2024 include: (1) ${category === 'mobile app' ? 'native-first performance optimization and intuitive gesture-based navigation' : category === 'social media' ? 'platform-specific content strategies and authentic engagement tactics' : 'grounding the experience in clear business and user goals'}, (2) ${category === 'mobile app' || category === 'mobile site' ? 'offline-first architecture and progressive enhancement' : 'designing mobile-first, flexible layouts'}, (3) ${category === 'branding package' ? 'establishing a cohesive visual language that scales across all touchpoints' : 'using strong visual hierarchy and scannable content structure'}, (4) ${category === 'pitch deck' ? 'data visualization and compelling narrative flow' : 'validating flows with real users or proxies'}, and (5) ${category === 'plugin' ? 'comprehensive documentation and developer-friendly APIs' : 'instrumenting the experience with analytics, A/B testing, and performance monitoring'}. The approach should emphasize ${insights.focus} while maintaining ${category === 'mobile app' ? 'technical excellence' : category === 'social media' ? 'brand consistency' : 'scalability and maintainability'}.`;

  // Strategic recommendations tailored to inputs
  const strategicContext = priority === 'urgent'
    ? 'Given the urgent timeline, we recommend a phased approach that delivers value quickly while maintaining quality. Focus on core features first, with clear milestones that allow for iterative refinement.'
    : priority === 'within-month'
    ? 'With a month-long timeline, we can balance thorough discovery with efficient execution. This allows for user validation, strategic alignment, and thoughtful implementation.'
    : 'The extended timeline provides opportunity for comprehensive research, user validation, and strategic refinement. We can take a more methodical approach that reduces risk and increases long-term value.';

  const strategicRecommendations = `To create a compelling ${category} project, we recommend positioning "${name}" as a ${category === 'branding package' ? 'distinctive visual identity' : category === 'social media' ? 'strategic content platform' : 'premium, high-clarity experience'} that clearly communicates value and drives measurable outcomes. ${strategicContext} The engagement should emphasize ${category === 'mobile app' ? 'technical architecture and user experience design' : 'discovery and alignment'} up front, ${category === 'pitch deck' ? 'compelling narrative structure' : 'thoughtful sequencing of milestones'}, and a strong handoff plan so the solution remains maintainable after launch. The SOW should explicitly connect ${category === 'branding package' ? 'design decisions' : category === 'social media' ? 'content strategy' : 'design and development activities'} back to measurable success criteria such as ${category === 'social media' ? 'engagement, reach, and conversion' : category === 'mobile app' ? 'user retention and app store ratings' : 'engagement, conversion, or lead quality'}.`;

  // Intelligent, dynamic metrics based on category, priority, and project context
  // Category‑aware baselines with context adjustments
  let baseCompetitive = 70;
  let uxLift = 78;

  // Category-specific competitive intensity
  if (/social media/i.test(category)) {
    baseCompetitive = 88; // Highly saturated
    uxLift = 72; // Content-focused, less UX-heavy
  } else if (/mobile app/i.test(category)) {
    baseCompetitive = 84; // Very competitive
    uxLift = 82; // UX is critical
  } else if (/mobile site/i.test(category)) {
    baseCompetitive = 82;
    uxLift = 80;
  } else if (/branding package/i.test(category)) {
    baseCompetitive = 76; // Moderate competition
    uxLift = 80; // Visual design is key
  } else if (/pitch deck/i.test(category)) {
    baseCompetitive = 74; // Less crowded
    uxLift = 75; // Storytelling focus
  } else if (/plugin/i.test(category)) {
    baseCompetitive = 80; // Technical competition
    uxLift = 85; // Developer experience critical
  } else if (/motion graphics|video/i.test(category)) {
    baseCompetitive = 78;
    uxLift = 77; // Creative and technical balance
  }

  // Adjust based on project summary complexity
  if (summary) {
    const complexity = summary.length > 200 ? 1.1 : summary.length > 100 ? 1.05 : 1.0;
    uxLift = Math.min(95, Math.round(uxLift * complexity));
  }

  // Differentiation opportunity inversely related to competition
  const baseDifferentiation = Math.max(15, 100 - Math.min(95, baseCompetitive + 8));
  
  // Adjust differentiation based on how unique the project sounds
  let differentiationBonus = 0;
  if (summary) {
    const uniqueKeywords = ['unique', 'innovative', 'first', 'revolutionary', 'breakthrough', 'cutting-edge'];
    const hasUnique = uniqueKeywords.some(kw => summary.toLowerCase().includes(kw));
    if (hasUnique) differentiationBonus = 8;
  }
  const finalDifferentiation = Math.min(95, baseDifferentiation + differentiationBonus);

  // Priority‑aware timeline pressure
  let timeline = 60;
  if (/urgent/i.test(projectPriorityLabel || '')) {
    timeline = 88;
  } else if (/month/i.test(projectPriorityLabel || '')) {
    timeline = 72;
  } else if (/no rush/i.test(projectPriorityLabel || '')) {
    timeline = 52;
  }

  const metrics: MarketResearchMetrics = {
    competitiveIntensity: baseCompetitive, // how crowded the space is
    differentiationOpportunity: finalDifferentiation, // headroom to stand out
    uxElevationNeeded: uxLift, // how much UX lift is expected relative to peers
    timelinePressure: timeline,
  };

  return {
    marketSummary,
    competitiveLandscape,
    bestPractices,
    strategicRecommendations,
    metrics,
  };
}

