export enum AnalyticsEvents {
  LLM_CONFIG_SAVED = 'LLM Config Saved',
  LLM_RESPONSE_TIME = 'LLM Response Time',
  FEEDBACK_SUBMITTED = 'Feedback Submitted'
}

export enum AnalyticsEventSource {
  GENERATE_SUGGESTIONS = 'Generate Suggestions',
  AI_CHAT = 'AI Chat',
  LLM_SETTINGS = 'LLM Settings'
}

export enum AnalyticsEventStatus {
  SUCCESS = 'success',
  FAILURE = 'failure'
}
