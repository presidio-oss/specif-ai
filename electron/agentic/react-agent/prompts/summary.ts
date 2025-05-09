import { BaseMessage } from "@langchain/core/messages";

const summarizeConversation = (
  previousSummary?: string,
  // messages: BaseMessage[]
) => `You are an excellent assistant. Your task is to summarize the above conversation between you boss and a user.

You will generate a concise yet information dense summary of the conversation. You have to conver important details and context of the conversation.
You will also make sure to track any tool calls made and their results as concisely as possible and the ones that would help you in the future.

${previousSummary ? `Previous summary: ${previousSummary}` : ""}

STRICT GUIDELINES:
- Make every word count. Do not add any filler words.
- Do not repeat the same information in different words.
- Make space with fusion, compression, and removal of uninformative phrases like "the conversation discusses", "please let me know if you have any questions", etc.
- The summaries should become highly dense and concise yet self-contained, i.e., easily understood without the need to access the original conversation.
- You MUST NOT miss any important details of conversations or any tool calls made that would lead to duplicate tool calls or infinite loops.
- You MUST note important decisions made during the conversation.
- You can ignore information that can be retrieved again using a tool call, but note that the tool call was made.
- If previous summary is provided, make sure the details in the previous summary are included in the new summary and the information is not repeated.
  If any details in previous summary are not relevant anymore, you can remove them.
- Please do not use any tools available to you to generate the summary. I repeat, you MUST NOT use any tools available to you to generate the summary.
`;

export { summarizeConversation };
