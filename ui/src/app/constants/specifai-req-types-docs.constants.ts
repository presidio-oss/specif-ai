/**
 * Links to docs in SpecifAI
 */

import { REQUIREMENT_TYPE, REQUIREMENT_DISPLAY_NAME_MAP } from './app.constants';

export interface CoreFeature {
  id: string;
  title: string;
  description: string;
  url: string;
  emoji: string;
}

export const SPECIFAI_BASE_URL = 'https://specifai.io/current/requirement-types';

export const SPECIFAI_REQ_DOCS = [
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

export type ReqsDocsType = (typeof SPECIFAI_REQ_DOCS)[number];