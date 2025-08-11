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

export const SPECIFAI_REQ_DOCS = {
  [REQUIREMENT_TYPE.BRD]: `${SPECIFAI_BASE_URL}#1-business-requirements-brd`,
  [REQUIREMENT_TYPE.PRD]: `${SPECIFAI_BASE_URL}#2-product-requirements-prd`,
  [REQUIREMENT_TYPE.US]: `${SPECIFAI_BASE_URL}#3-user-stories-us`,
  [REQUIREMENT_TYPE.TASK]: `${SPECIFAI_BASE_URL}#4-tasks`,
  [REQUIREMENT_TYPE.NFR]: `${SPECIFAI_BASE_URL}#5-non-functional-requirements-nfr`,
  [REQUIREMENT_TYPE.UIR]: `${SPECIFAI_BASE_URL}#6-user-interface-requirements-uir`,
  [REQUIREMENT_TYPE.TC]: `${SPECIFAI_BASE_URL}#7-test-cases-tc`,
  [REQUIREMENT_TYPE.SI]: `${SPECIFAI_BASE_URL}#8-strategic-initiatives-si`
} as const;

export type ReqsDocsType = (typeof SPECIFAI_REQ_DOCS)[keyof typeof SPECIFAI_REQ_DOCS];