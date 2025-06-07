export const APP_MESSAGES = {
  BLOCKED_REASON:
    "Prompt contains malicious content, that violates our security policies.",
  RESPONSE_NOT_PROCESSES:
    "Sorry, there was an error processing your response. Please try again or contact support if the issue persists.",

  QUIT_DIALOG: {
    TITLE: (processCount: number, isPlural: boolean) =>
      `${processCount} Active ${isPlural ? "Processes" : "Process"} Running`,
    MESSAGE: (isPlural: boolean) =>
      `You have ${
        isPlural ? "processes" : "a process"
      } currently running that ${
        isPlural ? "haven't" : "hasn't"
      } finished yet.`,
    DETAIL: (processListText: string) =>
      `Running: ${processListText}`,
    BUTTONS: {
      CANCEL: "Cancel",
      QUIT_ANYWAY: "Quit Anyway",
    },
  },
};
