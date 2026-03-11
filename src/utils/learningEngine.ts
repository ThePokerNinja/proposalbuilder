import { Answer, Question } from '../types';

export interface ProjectPattern {
  keywords: string[];
  category: string;
  typicalAnswers: Record<string, string | string[]>;
  confidence: number;
  occurrences: number;
}

export interface LearningData {
  patterns: ProjectPattern[];
  lastUpdated: Date;
  version: number;
}

/**
 * Analyze project name and context to extract key insights
 */
export function analyzeProjectInput(projectName: string, context: string): {
  keywords: string[];
  projectType: string;
  complexity: 'low' | 'medium' | 'high';
  industry: string | null;
  features: string[];
} {
  const combinedText = `${projectName} ${context}`.toLowerCase();
  
  // Extract keywords
  const keywords = combinedText
    .split(/\s+/)
    .filter(word => word.length > 3)
    .filter(word => !['the', 'and', 'for', 'with', 'from', 'this', 'that'].includes(word));

  // Detect project type
  let projectType = 'website';
  if (combinedText.includes('brand') || combinedText.includes('identity') || combinedText.includes('logo')) {
    projectType = 'branding';
  } else if (combinedText.includes('design system') || combinedText.includes('ui kit')) {
    projectType = 'design-system';
  } else if (combinedText.includes('ecommerce') || combinedText.includes('e-commerce') || combinedText.includes('shop')) {
    projectType = 'ecommerce';
  } else if (combinedText.includes('app') || combinedText.includes('mobile') || combinedText.includes('ios') || combinedText.includes('android')) {
    projectType = 'app';
  }

  // Assess complexity
  let complexity: 'low' | 'medium' | 'high' = 'medium';
  const complexityIndicators = {
    high: ['enterprise', 'platform', 'system', 'integration', 'api', 'backend', 'database', 'complex', 'multiple', 'scalable'],
    low: ['simple', 'basic', 'small', 'single', 'landing', 'brochure', 'minimal']
  };
  
  const highCount = complexityIndicators.high.filter(ind => combinedText.includes(ind)).length;
  const lowCount = complexityIndicators.low.filter(ind => combinedText.includes(ind)).length;
  
  if (highCount > 2) complexity = 'high';
  else if (lowCount > 1) complexity = 'low';

  // Detect industry
  const industries: Record<string, string[]> = {
    healthcare: ['health', 'medical', 'hospital', 'clinic', 'patient'],
    finance: ['finance', 'banking', 'financial', 'payment', 'fintech', 'investment'],
    retail: ['retail', 'store', 'merchandise', 'product', 'inventory'],
    education: ['education', 'school', 'university', 'learning', 'course', 'student'],
    technology: ['tech', 'software', 'saas', 'platform', 'digital'],
    nonprofit: ['nonprofit', 'non-profit', 'charity', 'foundation', 'donation'],
  };

  let industry: string | null = null;
  for (const [ind, terms] of Object.entries(industries)) {
    if (terms.some(term => combinedText.includes(term))) {
      industry = ind;
      break;
    }
  }

  // Extract feature indicators
  const features: string[] = [];
  const featureMap: Record<string, string[]> = {
    'ecommerce': ['cart', 'checkout', 'payment', 'product', 'inventory'],
    'cms': ['content', 'blog', 'article', 'editor', 'publish'],
    'authentication': ['login', 'signup', 'user', 'account', 'profile'],
    'analytics': ['analytics', 'tracking', 'metrics', 'data', 'report'],
    'api': ['api', 'integration', 'webhook', 'endpoint'],
    'multilingual': ['language', 'translation', 'multilingual', 'i18n'],
  };

  for (const [feature, terms] of Object.entries(featureMap)) {
    if (terms.some(term => combinedText.includes(term))) {
      features.push(feature);
    }
  }

  return {
    keywords,
    projectType,
    complexity,
    industry,
    features,
  };
}

/**
 * Generate intelligent predictions based on project analysis
 */
export function generatePredictions(
  analysis: ReturnType<typeof analyzeProjectInput>,
  learningData?: LearningData
): Partial<Record<string, string | string[]>> {
  const predictions: Partial<Record<string, string | string[]>> = {};

  // Use learned patterns if available
  if (learningData && learningData.patterns.length > 0) {
    const matchingPatterns = learningData.patterns
      .filter(pattern => 
        pattern.keywords.some(keyword => 
          analysis.keywords.some(k => k.includes(keyword) || keyword.includes(k))
        )
      )
      .sort((a, b) => b.confidence - a.confidence);

    if (matchingPatterns.length > 0) {
      const bestMatch = matchingPatterns[0];
      if (bestMatch.confidence > 0.6) {
        Object.assign(predictions, bestMatch.typicalAnswers);
      }
    }
  }

  // Apply intelligent defaults based on analysis
  if (!predictions['project-type']) {
    if (analysis.projectType === 'branding') {
      predictions['project-type'] = 'Branding';
    } else if (analysis.projectType === 'design-system') {
      predictions['project-type'] = 'Design System';
    } else if (analysis.projectType === 'ecommerce') {
      predictions['project-type'] = 'Website';
    } else {
      predictions['project-type'] = 'Website';
    }
  }

  if (!predictions['project-scale']) {
    if (analysis.complexity === 'high') {
      predictions['project-scale'] = analysis.features.length > 3 ? 'Enterprise' : 'Large (16+ pages/screens)';
    } else if (analysis.complexity === 'low') {
      predictions['project-scale'] = 'Small (1-5 pages/screens)';
    } else {
      predictions['project-scale'] = 'Medium (6-15 pages/screens)';
    }
  }

  if (!predictions['integration-complexity']) {
    const integrations: string[] = [];
    if (analysis.features.includes('ecommerce')) {
      integrations.push('E-commerce platform');
    }
    if (analysis.features.includes('api')) {
      integrations.push('Third-party APIs');
    }
    if (analysis.complexity === 'high') {
      integrations.push('Custom backend development');
    }
    if (analysis.features.includes('analytics')) {
      integrations.push('Analytics & tracking');
    }
    if (integrations.length > 0) {
      predictions['integration-complexity'] = integrations;
    } else {
      predictions['integration-complexity'] = ['None - standalone project'];
    }
  }

  // Industry-specific predictions
  if (analysis.industry === 'healthcare' || analysis.industry === 'finance') {
    if (!predictions['target-audience']) {
      predictions['target-audience'] = 'B2B Professionals';
    }
    if (!predictions['brand-maturity']) {
      predictions['brand-maturity'] = 'Established brand (refinement)';
    }
  }

  if (analysis.complexity === 'high') {
    if (!predictions['timeline-preference']) {
      predictions['timeline-preference'] = 'Standard (1-3 months)';
    }
  }

  return predictions;
}

/**
 * Learn from completed projects to improve future predictions
 */
export function learnFromProject(
  projectName: string,
  context: string,
  finalAnswers: Answer[],
  learningData?: LearningData
): LearningData {
  const analysis = analyzeProjectInput(projectName, context);
  const existingPatterns = learningData?.patterns || [];
  
  // Convert answers to a record
  const answerRecord: Record<string, string | string[]> = {};
  finalAnswers.forEach(answer => {
    answerRecord[answer.questionId] = answer.value;
  });

  // Find or create matching pattern
  let matchingPattern = existingPatterns.find(pattern =>
    pattern.keywords.some(keyword =>
      analysis.keywords.some(k => k.includes(keyword) || keyword.includes(k))
    ) && pattern.category === analysis.projectType
  );

  if (matchingPattern) {
    // Update existing pattern
    matchingPattern.occurrences += 1;
    
    // Update typical answers (weighted average)
    Object.keys(answerRecord).forEach(questionId => {
      const existingAnswer = matchingPattern!.typicalAnswers[questionId];
      const newAnswer = answerRecord[questionId];
      
      if (!existingAnswer) {
        matchingPattern!.typicalAnswers[questionId] = newAnswer;
      } else if (JSON.stringify(existingAnswer) !== JSON.stringify(newAnswer)) {
        // If answers differ, keep the most common one (simplified - in production, use frequency analysis)
        matchingPattern!.typicalAnswers[questionId] = newAnswer;
      }
    });
    
    // Increase confidence with more occurrences
    matchingPattern.confidence = Math.min(0.95, 0.5 + (matchingPattern.occurrences * 0.1));
  } else {
    // Create new pattern
    const newPattern: ProjectPattern = {
      keywords: analysis.keywords.slice(0, 10), // Keep top 10 keywords
      category: analysis.projectType,
      typicalAnswers: answerRecord,
      confidence: 0.6,
      occurrences: 1,
    };
    existingPatterns.push(newPattern);
  }

  return {
    patterns: existingPatterns,
    lastUpdated: new Date(),
    version: (learningData?.version || 0) + 1,
  };
}

/**
 * Get stored learning data from localStorage
 */
export function getLearningData(): LearningData | null {
  try {
    const stored = localStorage.getItem('proposalBuilder_learning');
    if (stored) {
      const data = JSON.parse(stored);
      // Convert date strings back to Date objects
      data.lastUpdated = new Date(data.lastUpdated);
      return data;
    }
  } catch (error) {
    console.error('Error loading learning data:', error);
  }
  return null;
}

/**
 * Save learning data to localStorage
 */
export function saveLearningData(data: LearningData): void {
  try {
    localStorage.setItem('proposalBuilder_learning', JSON.stringify(data));
  } catch (error) {
    console.error('Error saving learning data:', error);
  }
}
