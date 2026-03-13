import { Task } from '../types';
import { Answer } from '../types';
import { analyzeProjectInput } from './learningEngine';

/**
 * Generate context-aware tasks based on project type, complexity, and answers
 * Only includes relevant tasks for the actual work being requested
 */
export function generateContextualTasks(
  projectName: string,
  projectSummary: string,
  answers: Answer[]
): Task[] {
  const analysis = analyzeProjectInput(projectName, projectSummary);
  const combinedText = `${projectName} ${projectSummary}`.toLowerCase();
  const answerMap = new Map(answers.map(a => [a.questionId, a.value]));
  
  const tasks: Task[] = [];
  
  // Detect primary project type from context
  const isLogo = combinedText.includes('logo') || combinedText.includes('logotype') || 
                 combinedText.includes('brand mark') || combinedText.includes('wordmark');
  const isBranding = combinedText.includes('brand') || combinedText.includes('branding') || 
                     combinedText.includes('identity') || combinedText.includes('visual identity') ||
                     answerMap.get('project-scope')?.toString().toLowerCase().includes('brand');
  const isWebsite = combinedText.includes('website') || combinedText.includes('web') || 
                    combinedText.includes('site') || combinedText.includes('webpage') ||
                    answerMap.get('project-scope')?.toString().toLowerCase().includes('website');
  const isVideo = combinedText.includes('video') || combinedText.includes('film') || 
                  combinedText.includes('editing') || combinedText.includes('production');
  const isDesignSystem = combinedText.includes('design system') || combinedText.includes('ui kit') ||
                          combinedText.includes('component library');
  const isEcommerce = combinedText.includes('ecommerce') || combinedText.includes('e-commerce') ||
                      combinedText.includes('shop') || combinedText.includes('store') ||
                      combinedText.includes('cart') || combinedText.includes('checkout');
  const isApp = combinedText.includes('app') || combinedText.includes('application') ||
                combinedText.includes('mobile app') || combinedText.includes('ios') ||
                combinedText.includes('android');
  const isPrint = combinedText.includes('print') || combinedText.includes('brochure') ||
                  combinedText.includes('flyer') || combinedText.includes('poster') ||
                  combinedText.includes('business card');
  const isSocialMedia = combinedText.includes('social media') || combinedText.includes('instagram') ||
                        combinedText.includes('facebook') || combinedText.includes('linkedin');
  const isPackaging = combinedText.includes('packaging') || combinedText.includes('label') ||
                      combinedText.includes('box') || combinedText.includes('product design');
  
  // LOGO PROJECTS (8-20 hours typical)
  if (isLogo && !isBranding && !isWebsite) {
    tasks.push(
      { id: 'discovery', name: 'Discovery & Strategy', baseHours: 2, multiplier: 1, category: 'Planning' },
      { id: 'research', name: 'Research & Competitive Analysis', baseHours: 3, multiplier: 1, category: 'Planning' },
      { id: 'logo-design', name: 'Logo Design & Concepts', baseHours: 8, multiplier: 1, category: 'Design' },
      { id: 'revisions', name: 'Revisions & Refinement', baseHours: 4, multiplier: 1, category: 'Quality' },
      { id: 'deliverables', name: 'Final Files & Brand Guidelines', baseHours: 3, multiplier: 1, category: 'Delivery' }
    );
  }
  
  // BRANDING PROJECTS (20-60 hours typical)
  else if (isBranding && !isWebsite && !isLogo) {
    tasks.push(
      { id: 'discovery', name: 'Discovery & Brand Strategy', baseHours: 6, multiplier: 1, category: 'Planning' },
      { id: 'research', name: 'Market Research & Competitive Analysis', baseHours: 8, multiplier: 1, category: 'Planning' },
      { id: 'logo-design', name: 'Logo & Brand Mark Design', baseHours: 12, multiplier: 1, category: 'Design' },
      { id: 'brand-identity', name: 'Brand Identity System', baseHours: 16, multiplier: 1, category: 'Design' },
      { id: 'typography', name: 'Typography & Color Palette', baseHours: 6, multiplier: 1, category: 'Design' },
      { id: 'brand-guidelines', name: 'Brand Guidelines Document', baseHours: 8, multiplier: 1, category: 'Design' },
      { id: 'revisions', name: 'Revisions & Refinement', baseHours: 8, multiplier: 1, category: 'Quality' },
      { id: 'deliverables', name: 'Final Assets & Documentation', baseHours: 6, multiplier: 1, category: 'Delivery' }
    );
  }
  
  // VIDEO PROJECTS (40-120 hours typical)
  else if (isVideo) {
    tasks.push(
      { id: 'discovery', name: 'Discovery & Creative Brief', baseHours: 4, multiplier: 1, category: 'Planning' },
      { id: 'pre-production', name: 'Pre-Production Planning', baseHours: 8, multiplier: 1, category: 'Planning' },
      { id: 'production', name: 'Video Production/Shooting', baseHours: 16, multiplier: 1, category: 'Production' },
      { id: 'editing', name: 'Video Editing & Post-Production', baseHours: 24, multiplier: 1, category: 'Production' },
      { id: 'motion-graphics', name: 'Motion Graphics & Animation', baseHours: 12, multiplier: 1, category: 'Design' },
      { id: 'audio', name: 'Audio Mixing & Sound Design', baseHours: 6, multiplier: 1, category: 'Production' },
      { id: 'revisions', name: 'Revisions & Refinement', baseHours: 8, multiplier: 1, category: 'Quality' },
      { id: 'deliverables', name: 'Final Video Files & Formats', baseHours: 2, multiplier: 1, category: 'Delivery' }
    );
  }
  
  // WEBSITE PROJECTS (60-200+ hours typical)
  else if (isWebsite || isEcommerce) {
    tasks.push(
      { id: 'discovery', name: 'Discovery & Strategy', baseHours: 8, multiplier: 1, category: 'Planning' },
      { id: 'research', name: 'Research & Analysis', baseHours: 10, multiplier: 1, category: 'Planning' },
      { id: 'information-architecture', name: 'Information Architecture & Sitemap', baseHours: 6, multiplier: 1, category: 'Planning' },
      { id: 'ui-design', name: 'UI/UX Design', baseHours: 32, multiplier: 1, category: 'Design' },
      { id: 'content', name: 'Content Strategy & Creation', baseHours: 12, multiplier: 1, category: 'Content' },
      { id: 'development', name: 'Frontend Development', baseHours: 48, multiplier: 1, category: 'Development' },
      { id: 'testing', name: 'Testing & QA', baseHours: 10, multiplier: 1, category: 'Quality' },
      { id: 'revisions', name: 'Revisions & Refinement', baseHours: 12, multiplier: 1, category: 'Quality' },
      { id: 'launch', name: 'Launch & Handoff', baseHours: 6, multiplier: 1, category: 'Deployment' }
    );
    
    // Add e-commerce specific tasks
    if (isEcommerce) {
      tasks.push(
        { id: 'ecommerce-setup', name: 'E-commerce Platform Setup', baseHours: 16, multiplier: 1, category: 'Development' },
        { id: 'payment-integration', name: 'Payment & Checkout Integration', baseHours: 12, multiplier: 1, category: 'Development' }
      );
    }
  }
  
  // DESIGN SYSTEM PROJECTS (80-150 hours typical)
  else if (isDesignSystem) {
    tasks.push(
      { id: 'discovery', name: 'Discovery & Audit', baseHours: 8, multiplier: 1, category: 'Planning' },
      { id: 'research', name: 'Research & Analysis', baseHours: 10, multiplier: 1, category: 'Planning' },
      { id: 'design-tokens', name: 'Design Tokens & Foundations', baseHours: 12, multiplier: 1, category: 'Design' },
      { id: 'component-design', name: 'Component Design', baseHours: 32, multiplier: 1, category: 'Design' },
      { id: 'component-development', name: 'Component Development', baseHours: 40, multiplier: 1, category: 'Development' },
      { id: 'documentation', name: 'Documentation & Guidelines', baseHours: 16, multiplier: 1, category: 'Design' },
      { id: 'testing', name: 'Testing & QA', baseHours: 8, multiplier: 1, category: 'Quality' },
      { id: 'revisions', name: 'Revisions & Refinement', baseHours: 10, multiplier: 1, category: 'Quality' },
      { id: 'deliverables', name: 'Final System & Handoff', baseHours: 4, multiplier: 1, category: 'Delivery' }
    );
  }
  
  // MOBILE APP PROJECTS (120-300+ hours typical)
  else if (isApp) {
    tasks.push(
      { id: 'discovery', name: 'Discovery & Strategy', baseHours: 10, multiplier: 1, category: 'Planning' },
      { id: 'research', name: 'Research & User Analysis', baseHours: 12, multiplier: 1, category: 'Planning' },
      { id: 'ui-design', name: 'UI/UX Design', baseHours: 40, multiplier: 1, category: 'Design' },
      { id: 'app-development', name: 'App Development', baseHours: 80, multiplier: 1, category: 'Development' },
      { id: 'backend-development', name: 'Backend & API Development', baseHours: 40, multiplier: 1, category: 'Development' },
      { id: 'testing', name: 'Testing & QA', baseHours: 16, multiplier: 1, category: 'Quality' },
      { id: 'revisions', name: 'Revisions & Refinement', baseHours: 16, multiplier: 1, category: 'Quality' },
      { id: 'app-store', name: 'App Store Submission', baseHours: 6, multiplier: 1, category: 'Deployment' }
    );
  }
  
  // PRINT DESIGN PROJECTS (8-40 hours typical)
  else if (isPrint) {
    tasks.push(
      { id: 'discovery', name: 'Discovery & Brief', baseHours: 2, multiplier: 1, category: 'Planning' },
      { id: 'design', name: 'Print Design', baseHours: 12, multiplier: 1, category: 'Design' },
      { id: 'revisions', name: 'Revisions & Refinement', baseHours: 4, multiplier: 1, category: 'Quality' },
      { id: 'prepress', name: 'Prepress & File Preparation', baseHours: 4, multiplier: 1, category: 'Delivery' }
    );
  }
  
  // SOCIAL MEDIA DESIGN (12-30 hours typical)
  else if (isSocialMedia) {
    tasks.push(
      { id: 'discovery', name: 'Discovery & Strategy', baseHours: 3, multiplier: 1, category: 'Planning' },
      { id: 'content-creation', name: 'Content Creation', baseHours: 12, multiplier: 1, category: 'Content' },
      { id: 'design', name: 'Social Media Design', baseHours: 10, multiplier: 1, category: 'Design' },
      { id: 'revisions', name: 'Revisions & Refinement', baseHours: 3, multiplier: 1, category: 'Quality' }
    );
  }
  
  // PACKAGING DESIGN (20-60 hours typical)
  else if (isPackaging) {
    tasks.push(
      { id: 'discovery', name: 'Discovery & Strategy', baseHours: 4, multiplier: 1, category: 'Planning' },
      { id: 'research', name: 'Market Research', baseHours: 6, multiplier: 1, category: 'Planning' },
      { id: 'packaging-design', name: 'Packaging Design', baseHours: 20, multiplier: 1, category: 'Design' },
      { id: 'structural-design', name: 'Structural Design & Dielines', baseHours: 12, multiplier: 1, category: 'Design' },
      { id: 'revisions', name: 'Revisions & Refinement', baseHours: 8, multiplier: 1, category: 'Quality' },
      { id: 'prepress', name: 'Prepress & Production Files', baseHours: 6, multiplier: 1, category: 'Delivery' }
    );
  }
  
  // COMBINED PROJECTS (branding + website)
  else if ((isBranding || isLogo) && isWebsite) {
    tasks.push(
      { id: 'discovery', name: 'Discovery & Strategy', baseHours: 10, multiplier: 1, category: 'Planning' },
      { id: 'research', name: 'Research & Analysis', baseHours: 12, multiplier: 1, category: 'Planning' },
      { id: 'branding', name: 'Brand Identity Design', baseHours: 20, multiplier: 1, category: 'Design' },
      { id: 'ui-design', name: 'UI/UX Design', baseHours: 40, multiplier: 1, category: 'Design' },
      { id: 'content', name: 'Content Strategy & Creation', baseHours: 16, multiplier: 1, category: 'Content' },
      { id: 'development', name: 'Development', baseHours: 60, multiplier: 1, category: 'Development' },
      { id: 'testing', name: 'Testing & QA', baseHours: 12, multiplier: 1, category: 'Quality' },
      { id: 'revisions', name: 'Revisions & Refinement', baseHours: 16, multiplier: 1, category: 'Quality' },
      { id: 'launch', name: 'Launch & Handoff', baseHours: 8, multiplier: 1, category: 'Deployment' }
    );
  }
  
  // DEFAULT: Generic digital project (fallback)
  else {
    tasks.push(
      { id: 'discovery', name: 'Discovery & Strategy', baseHours: 6, multiplier: 1, category: 'Planning' },
      { id: 'research', name: 'Research & Analysis', baseHours: 8, multiplier: 1, category: 'Planning' },
      { id: 'design', name: 'Design', baseHours: 24, multiplier: 1, category: 'Design' },
      { id: 'content', name: 'Content Creation', baseHours: 12, multiplier: 1, category: 'Content' },
      { id: 'revisions', name: 'Revisions & Refinement', baseHours: 8, multiplier: 1, category: 'Quality' },
      { id: 'deliverables', name: 'Final Deliverables', baseHours: 4, multiplier: 1, category: 'Delivery' }
    );
  }
  
  // Apply multipliers based on answers
  applyAnswerMultipliers(tasks, answers, analysis);
  
  return tasks;
}

/**
 * Apply multipliers to tasks based on answers and complexity
 */
function applyAnswerMultipliers(tasks: Task[], answers: Answer[], analysis: ReturnType<typeof analyzeProjectInput>): void {
  // const answerMap = new Map(answers.map(a => [a.questionId, a.value]));
  
  answers.forEach((answer) => {
    const value = Array.isArray(answer.value) ? answer.value : [answer.value];
    const stringValue = typeof answer.value === 'string' ? answer.value : Array.isArray(answer.value) ? answer.value.join(' ') : String(answer.value);

    switch (answer.questionId) {
      case 'project-scale':
      case 'project-scope':
        if (stringValue.includes('Small') || stringValue.includes('Focused')) {
          tasks.forEach((t) => {
            if (t.category === 'Design' || t.category === 'Development') {
              t.multiplier *= 0.6;
            }
          });
        } else if (stringValue.includes('Large') || stringValue.includes('Enterprise') || stringValue.includes('Comprehensive')) {
          tasks.forEach((t) => {
            if (t.category === 'Design' || t.category === 'Development') {
              t.multiplier *= 1.5;
            }
          });
        }
        break;

      case 'content-strategy':
        if (stringValue.includes('Need content creation') || stringValue.includes('Starting from scratch')) {
          const contentTask = tasks.find((t) => t.id === 'content' || t.id === 'content-creation');
          if (contentTask) {
            contentTask.multiplier *= 2.0;
          }
        } else if (stringValue.includes('Some content ready')) {
          const contentTask = tasks.find((t) => t.id === 'content' || t.id === 'content-creation');
          if (contentTask) {
            contentTask.multiplier *= 1.3;
          }
        }
        break;

      case 'technical-requirements':
        if (Array.isArray(answer.value)) {
          const complexity = answer.value.length;
          const devTask = tasks.find((t) => t.category === 'Development');
          if (devTask) {
            devTask.multiplier *= 1 + complexity * 0.15;
          }
          if (stringValue.includes('Custom backend') || stringValue.includes('backend development')) {
            const backendTask = tasks.find((t) => t.id === 'backend-development');
            if (backendTask) {
              backendTask.multiplier *= 1.5;
            } else if (devTask) {
              devTask.multiplier *= 1.3;
            }
          }
          if (stringValue.includes('E-commerce') || stringValue.includes('ecommerce')) {
            const ecommerceTask = tasks.find((t) => t.id === 'ecommerce-setup');
            if (ecommerceTask) {
              ecommerceTask.multiplier *= 1.2;
            }
          }
        }
        break;

      case 'timeline-urgency':
      case 'timeline-preference':
        if (stringValue.includes('Time-sensitive') || stringValue.includes('Rush') || stringValue.includes('2-4 weeks')) {
          tasks.forEach((t) => {
            if (t.category === 'Development' || t.category === 'Design' || t.category === 'Production') {
              t.multiplier *= 1.2;
            }
          });
        }
        break;

      case 'current-state':
        if (stringValue.includes('Starting from scratch') || stringValue.includes('no existing')) {
          const discoveryTask = tasks.find((t) => t.id === 'discovery');
          if (discoveryTask) {
            discoveryTask.multiplier *= 1.3;
          }
        }
        break;

      case 'revision-expectations':
        const revisionTask = tasks.find((t) => t.id === 'revisions');
        if (revisionTask) {
          if (value.includes('3-4 rounds')) {
            revisionTask.multiplier *= 1.5;
          } else if (value.includes('5+ rounds') || value.includes('Iterative')) {
            revisionTask.multiplier *= 2.0;
          }
        }
        break;
    }
  });
  
  // Apply complexity multiplier
  if (analysis.complexity === 'high') {
    tasks.forEach((t) => {
      if (t.category === 'Development' || t.category === 'Design') {
        t.multiplier *= 1.2;
      }
    });
  } else if (analysis.complexity === 'low') {
    tasks.forEach((t) => {
      if (t.category === 'Development' || t.category === 'Design') {
        t.multiplier *= 0.8;
      }
    });
  }
}
