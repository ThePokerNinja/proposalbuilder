import { Question } from '../types';
import { analyzeProjectInput } from './learningEngine';

/**
 * Generate intelligent, personalized questions based on project name and summary
 * Focuses on problem statement, target audience, and business value
 */
export function generatePersonalizedQuestions(
  projectName: string,
  projectSummary: string
): Question[] {
  const analysis = analyzeProjectInput(projectName, projectSummary);
  const combinedText = `${projectName} ${projectSummary}`.toLowerCase();
  
  // Base questions that adapt based on project context
  const questions: Question[] = [];

  // Question 1: Problem Statement & Business Challenge (Always first)
  const problemQuestion: Question = {
    id: 'problem-statement',
    text: analysis.industry 
      ? `What specific business challenge or opportunity is "${projectName}" designed to solve for your ${analysis.industry} organization?`
      : `What specific business challenge or opportunity is "${projectName}" designed to solve?`,
    type: 'text',
    category: 'goals',
    weight: 1.5,
  };
  questions.push(problemQuestion);

  // Question 2: Target Audience (Personalized)
  const audienceOptions = generateAudienceOptions(analysis, combinedText);
  const audienceQuestion: Question = {
    id: 'target-audience',
    text: `Who is the primary audience for "${projectName}"? Understanding your ideal user helps us design experiences that drive real business results.`,
    type: 'select',
    options: audienceOptions,
    category: 'audience',
    weight: 1.3,
  };
  questions.push(audienceQuestion);

  // Question 3: Business Value & Success Metrics
  const valueQuestion: Question = {
    id: 'business-value',
    text: `What does success look like for "${projectName}"? How will you measure the ROI and impact of this project?`,
    type: 'multi-select',
    options: generateValueOptions(analysis, combinedText),
    category: 'goals',
    weight: 1.4,
  };
  questions.push(valueQuestion);

  // Question 4: Current State Assessment
  const currentStateQuestion: Question = {
    id: 'current-state',
    text: `What's your current situation? This helps us understand the gap between where you are and where you want to be.`,
    type: 'select',
    options: [
      'Starting from scratch - no existing digital presence',
      'Have existing website/brand but needs complete overhaul',
      'Have solid foundation but need strategic enhancement',
      'Established presence - looking to scale or optimize',
    ],
    category: 'scope',
    weight: 1.1,
  };
  questions.push(currentStateQuestion);

  // Question 5: Project Scope (Personalized based on detected type)
  const scopeOptions = generateScopeOptions(analysis);
  const scopeQuestion: Question = {
    id: 'project-scope',
    text: `Based on "${projectName}", what's the primary focus of this engagement?`,
    type: 'select',
    options: scopeOptions,
    category: 'scope',
    weight: 1.2,
  };
  questions.push(scopeQuestion);

  // Question 6: User Journey & Experience Goals
  const journeyQuestion: Question = {
    id: 'user-journey',
    text: `What's the ideal experience you want your audience to have with "${projectName}"?`,
    type: 'multi-select',
    options: [
      'Seamless, intuitive navigation',
      'Compelling brand storytelling',
      'Clear conversion path to action',
      'Educational and informative',
      'Engaging and interactive',
      'Professional and trustworthy',
      'Modern and innovative',
    ],
    category: 'goals',
    weight: 1.0,
  };
  questions.push(journeyQuestion);

  // Question 7: Content & Messaging Strategy
  const contentQuestion: Question = {
    id: 'content-strategy',
    text: `What's your content situation for "${projectName}"? Great design amplifies great content.`,
    type: 'select',
    options: [
      'We have all content ready - copy, images, assets',
      'We have some content but need strategic refinement',
      'We need content creation and strategy',
      'We're starting from scratch - need full content strategy',
    ],
    category: 'scope',
    weight: 0.9,
  };
  questions.push(contentQuestion);

  // Question 8: Technical Requirements (If complexity detected)
  if (analysis.complexity === 'high' || analysis.features.length > 0) {
    const techQuestion: Question = {
      id: 'technical-requirements',
      text: `What technical capabilities does "${projectName}" need to deliver on your business goals?`,
      type: 'multi-select',
      options: generateTechnicalOptions(analysis),
      category: 'scope',
      weight: 1.3,
    };
    questions.push(techQuestion);
  }

  // Question 9: Timeline & Urgency
  const timelineQuestion: Question = {
    id: 'timeline-urgency',
    text: `What's driving the timeline for "${projectName}"? Understanding urgency helps us prioritize and deliver maximum value.`,
    type: 'select',
    options: [
      'Time-sensitive launch or event (2-4 weeks)',
      'Strategic initiative with standard timeline (1-3 months)',
      'Long-term strategic project (3-6 months)',
      'Flexible timeline - quality over speed',
    ],
    category: 'constraints',
    weight: 0.8,
  };
  questions.push(timelineQuestion);

  // Question 10: Budget & Investment Clarity
  const budgetQuestion: Question = {
    id: 'investment-clarity',
    text: `To ensure "${projectName}" delivers maximum ROI, what's your investment range? This helps us scope the right solution.`,
    type: 'select',
    options: [
      'Under $15,000 - Focused, high-impact solution',
      '$15,000 - $35,000 - Comprehensive solution',
      '$35,000 - $75,000 - Enterprise-level solution',
      '$75,000+ - Custom enterprise solution',
      'Prefer to discuss after seeing proposal',
    ],
    category: 'constraints',
    weight: 0.7,
  };
  questions.push(budgetQuestion);

  return questions;
}

/**
 * Generate audience options personalized to the project
 */
function generateAudienceOptions(
  analysis: ReturnType<typeof analyzeProjectInput>,
  combinedText: string
): string[] {
  const baseOptions = [
    'B2B Decision Makers & Executives',
    'B2C Consumers & End Users',
    'Internal Teams & Employees',
    'Mixed Audience (B2B & B2C)',
  ];

  // Industry-specific customization
  if (analysis.industry === 'healthcare') {
    return [
      'Healthcare Professionals & Providers',
      'Patients & Care Seekers',
      'Healthcare Administrators',
      'Medical Researchers',
      ...baseOptions,
    ];
  } else if (analysis.industry === 'finance') {
    return [
      'Financial Advisors & Wealth Managers',
      'Individual Investors',
      'Business Owners & CFOs',
      'Financial Institutions',
      ...baseOptions,
    ];
  } else if (analysis.industry === 'education') {
    return [
      'Students & Learners',
      'Educators & Administrators',
      'Parents & Guardians',
      'Educational Institutions',
      ...baseOptions,
    ];
  } else if (analysis.industry === 'retail') {
    return [
      'Online Shoppers',
      'Retail Store Customers',
      'B2B Wholesale Buyers',
      'Retail Business Owners',
      ...baseOptions,
    ];
  }

  return baseOptions;
}

/**
 * Generate value/ROI options based on project analysis
 */
function generateValueOptions(
  analysis: ReturnType<typeof analyzeProjectInput>,
  combinedText: string
): string[] {
  const options = [
    'Increase qualified leads and conversions',
    'Improve brand recognition and market position',
    'Enhance user experience and engagement',
    'Drive revenue growth and sales',
    'Reduce operational costs and inefficiencies',
    'Establish thought leadership in your industry',
    'Improve customer retention and loyalty',
    'Enable business scalability and growth',
  ];

  // Add industry-specific options
  if (analysis.industry === 'healthcare') {
    options.unshift('Improve patient outcomes and satisfaction');
    options.push('Ensure HIPAA compliance and security');
  } else if (analysis.industry === 'finance') {
    options.unshift('Build trust and credibility with clients');
    options.push('Ensure regulatory compliance');
  } else if (analysis.industry === 'retail') {
    options.unshift('Increase online sales and average order value');
    options.push('Improve inventory management and operations');
  }

  return options;
}

/**
 * Generate scope options based on detected project type
 */
function generateScopeOptions(
  analysis: ReturnType<typeof analyzeProjectInput>
): string[] {
  if (analysis.projectType === 'branding') {
    return [
      'Complete brand identity (logo, colors, typography, guidelines)',
      'Brand refresh and modernization',
      'Brand strategy and positioning',
      'Brand application across digital channels',
    ];
  } else if (analysis.projectType === 'design-system') {
    return [
      'Complete design system and component library',
      'UI/UX design for specific product or platform',
      'Design system integration and documentation',
      'Design-to-development handoff system',
    ];
  } else if (analysis.projectType === 'ecommerce') {
    return [
      'Full e-commerce platform with checkout',
      'E-commerce redesign and optimization',
      'Product catalog and shopping experience',
      'E-commerce with custom integrations',
    ];
  } else {
    return [
      'Complete website redesign',
      'New website from scratch',
      'Strategic website enhancement',
      'Website with custom functionality',
      'Landing pages and conversion optimization',
    ];
  }
}

/**
 * Generate technical options based on detected features
 */
function generateTechnicalOptions(
  analysis: ReturnType<typeof analyzeProjectInput>
): string[] {
  const options: string[] = [];
  
  if (analysis.features.includes('ecommerce')) {
    options.push('E-commerce platform integration');
  }
  if (analysis.features.includes('cms')) {
    options.push('Content management system (CMS)');
  }
  if (analysis.features.includes('authentication')) {
    options.push('User authentication and accounts');
  }
  if (analysis.features.includes('api')) {
    options.push('Third-party API integrations');
  }
  if (analysis.features.includes('analytics')) {
    options.push('Analytics and tracking setup');
  }
  if (analysis.complexity === 'high') {
    options.push('Custom backend development');
    options.push('Database and data architecture');
  }
  
  // Always include these
  options.push('Responsive design (mobile, tablet, desktop)');
  options.push('SEO optimization and setup');
  options.push('Performance optimization');
  
  if (options.length === 3) {
    options.push('No special technical requirements');
  }
  
  return options;
}
