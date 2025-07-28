export const REQUIREMENT_TYPE = {
  BRD: "BRD",
  PRD: "PRD",
  UIR: "UIR",
  NFR: "NFR",
  BP: "BP",
  US: "US",
  TASK: "TASK",
  SI: "SI",
} as const;

export const REQUIREMENT_DISPLAY_NAME_MAP = {
  [REQUIREMENT_TYPE.US]: "User Story",
  [REQUIREMENT_TYPE.BP]: "Business Process",
  [REQUIREMENT_TYPE.BRD]: "Business Requirement",
  [REQUIREMENT_TYPE.NFR]: "Non Functional Requirement",
  [REQUIREMENT_TYPE.PRD]: "Product Requirement",
  [REQUIREMENT_TYPE.UIR]: "User Interface Requirement",
  [REQUIREMENT_TYPE.TASK]: "Task",
  [REQUIREMENT_TYPE.SI]: "Strategic Initiative",
};

export const REQUIREMENT_DISPLAY_NAME_PLURAL_MAP = {
  [REQUIREMENT_TYPE.US]: "User Stories",
  [REQUIREMENT_TYPE.BP]: "Business Processes",
  [REQUIREMENT_TYPE.BRD]: "Business Requirements",
  [REQUIREMENT_TYPE.NFR]: "Non Functional Requirements",
  [REQUIREMENT_TYPE.PRD]: "Product Requirements",
  [REQUIREMENT_TYPE.UIR]: "User Interface Requirements",
  [REQUIREMENT_TYPE.TASK]: "Tasks",
  [REQUIREMENT_TYPE.SI]: "Strategic Initiatives",
};