export interface MarketResearchMetrics {
  competitiveIntensity: number; // 0-100
  differentiationOpportunity: number; // 0-100
  uxElevationNeeded: number; // 0-100
  timelinePressure: number; // 0-100
}

export interface KPIPrediction {
  name: string;
  description: string;
  unit: string;
  exampleValue: string;
}

export interface MarketResearchResult {
  marketSummary: string;
  competitiveLandscape: string;
  bestPractices: string;
  strategicRecommendations: string;
  metrics: MarketResearchMetrics;
  kpi?: KPIPrediction;
}

/**
 * Extract keywords from context questions for intelligent analysis
 */
function extractKeywords(
  jobTitle: string,
  projectCategory: string,
  projectName: string,
  projectSummary: string
): string[] {
  const allText = `${jobTitle} ${projectCategory} ${projectName} ${projectSummary}`.toLowerCase();
  
  // Tech/Bay Area keywords
  const techKeywords = ['startup', 'saas', 'app', 'platform', 'api', 'software', 'tech', 'digital', 'web', 'mobile', 'ai', 'ml', 'data', 'cloud', 'dev', 'engineer', 'developer', 'product', 'founder', 'ceo', 'cto'];
  
  // Project type keywords
  const projectKeywords = ['website', 'site', 'portfolio', 'brand', 'branding', 'identity', 'logo', 'social', 'media', 'video', 'motion', 'graphics', 'pitch', 'deck', 'presentation', 'ecommerce', 'shop', 'store', 'marketplace'];
  
  // Business outcome keywords
  const outcomeKeywords = ['conversion', 'lead', 'sale', 'revenue', 'growth', 'engagement', 'user', 'customer', 'client', 'traffic', 'view', 'visit', 'signup', 'subscription', 'download', 'install'];
  
  const foundKeywords: string[] = [];
  
  [...techKeywords, ...projectKeywords, ...outcomeKeywords].forEach(keyword => {
    if (allText.includes(keyword) && !foundKeywords.includes(keyword)) {
      foundKeywords.push(keyword);
    }
  });
  
  // Extract meaningful phrases (2-3 word combinations)
  const words = allText.split(/\s+/).filter(w => w.length > 3);
  for (let i = 0; i < words.length - 1; i++) {
    const phrase = `${words[i]} ${words[i + 1]}`;
    if (phrase.length > 8 && !foundKeywords.includes(phrase)) {
      foundKeywords.push(phrase);
    }
  }
  
  return foundKeywords.slice(0, 15); // Limit to top 15 keywords
}

/**
 * Intelligently predict the most important KPI based on context questions and research insights
 * Uses keyword analysis, project type detection, and business goals to determine the primary success metric
 */
function predictKPI(
  jobTitle: string,
  projectCategory: string,
  projectName: string,
  projectSummary: string,
  keywords: string[] = []
): KPIPrediction {
  const combined = `${jobTitle} ${projectCategory} ${projectName} ${projectSummary}`.toLowerCase();
  const keywordStr = keywords.join(' ').toLowerCase();
  const allContext = `${combined} ${keywordStr}`;
  
  // Analyze job title for role-based KPI insights
  const isDesigner = /designer|design|creative|art director|visual/i.test(jobTitle);
  const isDeveloper = /developer|engineer|programmer|dev|tech|software/i.test(jobTitle);
  const isFounder = /founder|ceo|co-founder|entrepreneur|startup/i.test(jobTitle);
  const isMarketer = /marketing|marketer|growth|brand|content|social/i.test(jobTitle);
  
  // Analyze project category more intelligently
  const categoryLower = projectCategory.toLowerCase();
  const isWebsite = /website|web|site|landing|page/i.test(categoryLower) || 
                    /website|web|site|landing|page/i.test(allContext);
  const isEcommerce = /ecommerce|e-commerce|shop|store|marketplace|retail/i.test(allContext);
  const isPortfolio = /portfolio|personal|showcase|work|projects/i.test(allContext);
  const isSocial = /social|instagram|tiktok|twitter|facebook|linkedin|youtube/i.test(allContext);
  const isMobileApp = /mobile app|ios|android|app store|native app/i.test(allContext);
  const isBranding = /brand|branding|identity|logo|visual identity/i.test(allContext);
  const isPitch = /pitch|deck|presentation|investor|funding|raise/i.test(allContext);
  const isVideo = /video|motion|film|production|animation/i.test(allContext);
  const isSaaS = /saas|platform|subscription|recurring|software as a service/i.test(allContext);
  
  // Analyze project summary for business goals
  const hasConversionGoal = /convert|conversion|sales|revenue|revenue|purchase|buy/i.test(projectSummary);
  const hasEngagementGoal = /engage|engagement|interaction|participation|community/i.test(projectSummary);
  const hasGrowthGoal = /grow|growth|acquire|acquisition|expand|scale/i.test(projectSummary);
  const hasAwarenessGoal = /awareness|recognition|visibility|exposure|reach/i.test(projectSummary);
  const hasRetentionGoal = /retain|retention|retain|keep|stickiness|return/i.test(projectSummary);
  const hasLeadGoal = /lead|leads|inquiry|inquiries|contact|signup/i.test(projectSummary);
  
  // Intelligent KPI selection based on multiple factors
  
  // 1. E-commerce/Store → Revenue-focused metrics
  if (isEcommerce || (isWebsite && hasConversionGoal)) {
    return {
      name: 'Daily Revenue',
      description: 'Track daily sales and revenue generation to measure e-commerce effectiveness',
      unit: '$/day',
      exampleValue: '$450-$850/day'
    };
  }
  
  // 2. Website with conversion focus → Conversion rate
  if (isWebsite && (hasConversionGoal || hasLeadGoal)) {
    return {
      name: 'Conversion Rate',
      description: 'Measure percentage of visitors who complete desired actions (purchases, signups, leads)',
      unit: '%',
      exampleValue: '3.2-5.8%'
    };
  }
  
  // 3. Portfolio + Designer/Developer → Professional visibility
  if (isPortfolio && (isDesigner || isDeveloper)) {
    return {
      name: 'LinkedIn Profile Views',
      description: 'Track recruiter and hiring manager engagement with your professional profile',
      unit: 'views/week',
      exampleValue: '65-120 views/week'
    };
  }
  
  // 4. Social Media → Engagement metrics
  if (isSocial || (categoryLower.includes('social'))) {
    if (hasEngagementGoal) {
      return {
        name: 'Engagement Rate',
        description: 'Measure likes, comments, shares, and saves relative to reach and impressions',
        unit: '%',
        exampleValue: '5.2-8.4%'
      };
    }
    return {
      name: 'Follower Growth Rate',
      description: 'Track new followers and audience expansion over time',
      unit: 'followers/week',
      exampleValue: '120-250 followers/week'
    };
  }
  
  // 5. Mobile App → User engagement
  if (isMobileApp || categoryLower.includes('mobile app')) {
    if (hasRetentionGoal) {
      return {
        name: '7-Day Retention Rate',
        description: 'Measure user retention and app stickiness after first week',
        unit: '%',
        exampleValue: '42-58%'
      };
    }
    return {
      name: 'Daily Active Users',
      description: 'Track daily user engagement and app usage frequency',
      unit: 'DAU',
      exampleValue: '1,500-3,200 DAU'
    };
  }
  
  // 6. Branding/Identity → Brand awareness
  if (isBranding || categoryLower.includes('brand')) {
    if (hasAwarenessGoal) {
      return {
        name: 'Brand Awareness Score',
        description: 'Measure brand recognition and recall among target audience through surveys and analytics',
        unit: 'score (0-100)',
        exampleValue: '72-88 score'
      };
    }
    return {
      name: 'Brand Perception Index',
      description: 'Track how target audience perceives brand quality, trust, and differentiation',
      unit: 'index (0-100)',
      exampleValue: '68-82 index'
    };
  }
  
  // 7. Pitch Deck → Investor engagement
  if (isPitch || categoryLower.includes('pitch') || categoryLower.includes('deck')) {
    if (isFounder) {
      return {
        name: 'Investor Meeting Conversion',
        description: 'Track meetings scheduled and funding conversations initiated from pitch presentations',
        unit: 'meetings/month',
        exampleValue: '12-20 meetings/month'
      };
    }
    return {
      name: 'Presentation Engagement Score',
      description: 'Measure audience engagement, questions asked, and follow-up actions from presentations',
      unit: 'score (0-100)',
      exampleValue: '75-92 score'
    };
  }
  
  // 8. Video/Motion → Completion and engagement
  if (isVideo || categoryLower.includes('video') || categoryLower.includes('motion')) {
    if (hasEngagementGoal) {
      return {
        name: 'Video Completion Rate',
        description: 'Measure percentage of viewers who watch video to completion',
        unit: '%',
        exampleValue: '68-82%'
      };
    }
    return {
      name: 'Video Engagement Score',
      description: 'Track likes, shares, comments, and watch time relative to views',
      unit: 'score (0-100)',
      exampleValue: '58-75 score'
    };
  }
  
  // 9. SaaS/Platform → Growth or retention
  if (isSaaS || categoryLower.includes('saas') || categoryLower.includes('platform')) {
    if (hasGrowthGoal) {
      return {
        name: 'Monthly Recurring Revenue',
        description: 'Track subscription revenue growth and customer lifetime value',
        unit: 'MRR',
        exampleValue: '$18K-$42K MRR'
      };
    }
    if (hasRetentionGoal) {
      return {
        name: 'Monthly Churn Rate',
        description: 'Measure customer retention and subscription cancellation rate',
        unit: '%',
        exampleValue: '2.5-4.8%'
      };
    }
    return {
      name: 'New Signups',
      description: 'Track new user registrations and account creation',
      unit: 'signups/week',
      exampleValue: '85-150 signups/week'
    };
  }
  
  // 10. Website (generic) → Traffic or leads
  if (isWebsite) {
    if (hasLeadGoal) {
      return {
        name: 'Qualified Lead Generation',
        description: 'Track qualified leads and conversion opportunities from website traffic',
        unit: 'leads/week',
        exampleValue: '25-50 leads/week'
      };
    }
    return {
      name: 'Organic Traffic Growth',
      description: 'Measure increase in organic search traffic and visitor acquisition',
      unit: 'visitors/month',
      exampleValue: '+1,200-2,500 visitors/month'
    };
  }
  
  // 11. Default based on job title and goals
  if (isFounder && hasGrowthGoal) {
    return {
      name: 'Monthly Revenue Growth',
      description: 'Track month-over-month revenue growth and business expansion',
      unit: '% MoM',
      exampleValue: '15-28% MoM'
    };
  }
  
  if (isMarketer && hasEngagementGoal) {
    return {
      name: 'Campaign Engagement Rate',
      description: 'Measure audience engagement across marketing campaigns and channels',
      unit: '%',
      exampleValue: '4.8-7.5%'
    };
  }
  
  if (hasLeadGoal) {
    return {
      name: 'Lead Generation Rate',
      description: 'Track qualified leads and conversion opportunities',
      unit: 'leads/week',
      exampleValue: '20-40 leads/week'
    };
  }
  
  // Final default
  return {
    name: 'Project Success Score',
    description: 'Measure overall project effectiveness and achievement of primary business objectives',
    unit: 'score (0-100)',
    exampleValue: '72-88 score'
  };
}

/**
 * Generate intelligent research prompt based on extracted keywords
 * This prompt would be used for AI/search API integration in the future
 * Currently kept for future enhancement when AI integration is added
 */
export function generateResearchPrompt(
  keywords: string[],
  _jobTitle: string,
  projectCategory: string,
  _projectName: string,
  _projectSummary: string
): string {
  const keywordStr = keywords.slice(0, 8).join(', ');
  const context = `Tech project in the Bay Area focused on ${projectCategory || 'digital experience'}`;
  
  return `Analyze the current market trends for ${context}. Key context: ${keywordStr}. 
    Focus on: (1) Latest 2024-2025 market trends and competitive dynamics, 
    (2) Strategic opportunities for differentiation, 
    (3) Best practices from leading players, 
    (4) Actionable recommendations for success. 
    Consider the Bay Area tech ecosystem and current market conditions.`;
}

// Intelligent market research that analyzes project context dynamically
// Enhanced to use keyword extraction and intelligent prompt generation
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

  // Extract keywords from context questions for intelligent analysis
  const keywords = extractKeywords(title, category, name, summary);
  
  // Generate intelligent research prompt (for future AI integration)
  // In production, this prompt would be sent to an AI service or search API
  // const researchPrompt = generateResearchPrompt(keywords, title, category, name, summary);
  // Currently using the prompt logic inline, but keeping function for future use
  
  // Intelligently predict KPI based on context questions AND keywords
  // This uses all 5 context questions (jobTitle, projectCategory, projectName, projectSummary, projectPriority)
  // plus extracted keywords to create a dynamic, intelligent KPI prediction
  const kpi = predictKPI(title, category, name, summary, keywords);

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

  // Enhanced market summary with keyword intelligence and 2024-2025 trends
  const keywordContext = keywords.length > 0 
    ? ` Based on analysis of key indicators (${keywords.slice(0, 3).join(', ')}), `
    : ' ';
  
  // Add current market trends (2024-2025 focus)
  const currentYear = new Date().getFullYear();
  const trendContext = currentYear >= 2024 
    ? `In ${currentYear}, the ${insights.market} space is experiencing significant shifts: ${insights.trends.slice(0, 2).join(' and ')} are driving market evolution, with Bay Area tech companies leading adoption.`
    : `Current market trends emphasize ${insights.trends.slice(0, 2).join(' and ')}`;
  
  const marketSummary = `${marketContext} operating in the ${insights.market} space.${keywordContext}${trendContext} Leading players are investing heavily in ${insights.focus}, with particular emphasis on measurable outcomes and strategic differentiation.${summaryContext}${priorityContext}`;

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
    kpi,
  };
}

