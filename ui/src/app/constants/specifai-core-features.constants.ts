/**
 * SpecifAI Core Features Constants
 * SPECIFAI_CORE_FEATURES and SPECIFAI_ADDITIONAL_FEATURES are untested but SPECIFAI_DOCUMENT_TYPES are tested in the app
 */

import { REQUIREMENT_TYPE, REQUIREMENT_DISPLAY_NAME_MAP } from './app.constants';

export interface CoreFeature {
  id: string;
  title: string;
  description: string;
  url: string;
  emoji: string;
}

export const SPECIFAI_BASE_URL = 'https://specifai.io/current/core-features';

export const SPECIFAI_CORE_FEATURES: CoreFeature[] = [
  {
    id: 'solution-creation',
    title: 'Solution Creation',
    description: 'Transform your ideas into well-structured solutions in minutes',
    url: `${SPECIFAI_BASE_URL}#-solution-creation`,
    emoji: '🎯'
  },
  {
    id: 'requirements-document-types',
    title: 'Requirements Document Types and Best Practices',
    description: 'Streamline creation of essential SDLC documents through AI-powered generation',
    url: `${SPECIFAI_BASE_URL}#-requirements-document-types-and-best-practices`,
    emoji: '📝'
  },
  {
    id: 'visualizing-business-workflows',
    title: 'Visualizing Business Workflows',
    description: 'Visual representation of steps, decisions, and interactions in business processes',
    url: `${SPECIFAI_BASE_URL}#-visualizing-business-workflows`,
    emoji: '📊'
  },
  {
    id: 'organizing-refining-requirements',
    title: 'Organizing and Refining Your Requirements',
    description: 'Robust tools to organize and refine requirements (BRD, PRD, User Stories, Tasks, etc.)',
    url: `${SPECIFAI_BASE_URL}#%EF%B8%8F-organizing-and-refining-your-requirements`,
    emoji: '✍️'
  },
  {
    id: 'ai-chat-interface',
    title: 'AI Chat Interface',
    description: 'Your on-demand SDLC assistant with natural language understanding',
    url: `${SPECIFAI_BASE_URL}#-ai-chat-interface`,
    emoji: '💬'
  },
  {
    id: 'automating-user-story-task-creation',
    title: 'Automating User Story & Task Creation',
    description: 'Seamless generation of user stories and associated tasks from PRDs',
    url: `${SPECIFAI_BASE_URL}#-automating-user-story--task-creation`,
    emoji: '📝'
  },
  {
    id: 'model-configuration',
    title: 'Model Configuration',
    description: 'Flexible AI model configuration with support for various language models',
    url: `${SPECIFAI_BASE_URL}#-model-configuration`,
    emoji: '🧠'
  },
  {
    id: 'ai-powered-inline-editing',
    title: 'AI-Powered Inline Editing',
    description: 'Instantly improve any text within editable fields using AI assistance',
    url: `${SPECIFAI_BASE_URL}#-ai-powered-inline-editing`,
    emoji: '🪄'
  }
];

export const SPECIFAI_ADDITIONAL_FEATURES: CoreFeature[] = [
  {
    id: 'automating-test-case-generation',
    title: 'Automating Test Case Generation',
    description: 'Generate comprehensive test cases from user stories for quality assurance',
    url: `${SPECIFAI_BASE_URL}#-automating-test-case-generation`,
    emoji: '🧪'
  },
  {
    id: 'automating-strategic-initiative-generation',
    title: 'Automating Strategic Initiative Generation',
    description: 'Create high-level strategic initiatives that align business goals with technical execution',
    url: `${SPECIFAI_BASE_URL}#-automating-strategic-initiative-generation`,
    emoji: '🎯'
  },
  {
    id: 'export-integration-options',
    title: 'Export and Integration Options',
    description: 'Seamless options to share and integrate requirements with stakeholders and development teams',
    url: `${SPECIFAI_BASE_URL}#-export-and-integration-options`,
    emoji: '📤'
  }
];

export const SPECIFAI_DOCUMENT_TYPES = [
  {
    id: REQUIREMENT_TYPE.BRD,
    name: REQUIREMENT_DISPLAY_NAME_MAP[REQUIREMENT_TYPE.BRD],
    url: `${SPECIFAI_BASE_URL}#1-business-requirements-brd`,
    description: 'Formal document describing business solution for a project'
  },
  {
    id: REQUIREMENT_TYPE.PRD,
    name: REQUIREMENT_DISPLAY_NAME_MAP[REQUIREMENT_TYPE.PRD],
    url: `${SPECIFAI_BASE_URL}#2-product-requirements-prd`,
    description: 'Technical document outlining specific requirements and functionalities'
  },
  {
    id: REQUIREMENT_TYPE.US,
    name: REQUIREMENT_DISPLAY_NAME_MAP[REQUIREMENT_TYPE.US],
    url: `${SPECIFAI_BASE_URL}#3-user-stories-us`,
    description: 'Concise descriptions of functionality from end user perspective'
  },
  {
    id: REQUIREMENT_TYPE.TASK,
    name: REQUIREMENT_DISPLAY_NAME_MAP[REQUIREMENT_TYPE.TASK],
    url: `${SPECIFAI_BASE_URL}#4-tasks`,
    description: 'Specific actionable items breaking down user stories into manageable work'
  },
  {
    id: REQUIREMENT_TYPE.NFR,
    name: REQUIREMENT_DISPLAY_NAME_MAP[REQUIREMENT_TYPE.NFR],
    url: `${SPECIFAI_BASE_URL}#5-non-functional-requirements-nfr`,
    description: 'Quality attributes and operational characteristics of a system'
  },
  {
    id: REQUIREMENT_TYPE.UIR,
    name: REQUIREMENT_DISPLAY_NAME_MAP[REQUIREMENT_TYPE.UIR],
    url: `${SPECIFAI_BASE_URL}#6-user-interface-requirements-uir`,
    description: 'Visual, interactive, and experiential aspects of system UI'
  },
  {
    id: REQUIREMENT_TYPE.TC,
    name: REQUIREMENT_DISPLAY_NAME_MAP[REQUIREMENT_TYPE.TC],
    url: `${SPECIFAI_BASE_URL}#7-test-cases-tc`,
    description: 'Detailed procedures to verify specific system aspects function as expected'
  },
  {
    id: REQUIREMENT_TYPE.SI,
    name: REQUIREMENT_DISPLAY_NAME_MAP[REQUIREMENT_TYPE.SI],
    url: `${SPECIFAI_BASE_URL}#8-strategic-initiatives-si`,
    description: 'High-level organizational objectives driving multiple solutions or projects'
  }
] as const;

// Helper functions
export const getCoreFeatureById = (id: string): CoreFeature | undefined => {
  return SPECIFAI_CORE_FEATURES.find(feature => feature.id === id) ||
         SPECIFAI_ADDITIONAL_FEATURES.find(feature => feature.id === id);
};

export const getAllFeatures = (): CoreFeature[] => {
  return [...SPECIFAI_CORE_FEATURES, ...SPECIFAI_ADDITIONAL_FEATURES];
};

export const getDetailsByReqType = (id: string) => {
  return SPECIFAI_DOCUMENT_TYPES.find(docType => docType.id === id);
};
