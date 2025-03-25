import { MARKDOWN_RULES } from '../../context/markdown-rules';

export interface AddTaskPromptParams {
  name: string;
  description: string;
  taskId: string;
  taskName: string;
  taskDescription: string;
  fileContent: string;
}

export function addTaskPrompt(params: AddTaskPromptParams): string {
  return `You are a senior architect tasked with creating detailed task from the provided client input. Below is all the information that you need to derive a task.

User Story Name:
${params.name}

User Story Description:
${params.description}

Task Id:
${params.taskId}

Client Request - Task Name:
${params.taskName}

Client Request - Task Description:
${params.taskDescription}

FileContent:
${params.fileContent}

Develop a detailed and well-structured task strictly derived from provided client requests and information from file content, with no additional or irrelevant information included. 
The "Client Request - Task Description" can be expanded to derive acceptance criteria based on provided input but do not include additional or irrelevant content.
An apt task name should be generated based on the updated acceptance criteria.

STRICT:
(!) Ensure to categorize the task based on client request as frontend, backend, API integration, UX screens, Infra changes if applicable.
(!) Output Structure should be a valid JSON: Here is the sample Structure. Follow this exactly. Do not add or change the response JSON:

# RESPONSE FORMAT EXAMPLE
{
    "tasks": [
        {
            "id": "<taskId>"
            "<task name>": "[description of the task]  \\n#### Acceptance Criteria:  \\n[acceptance criteria for the task as sentences]"
        }
    ]
}

STRICT:

Special Instruction:
1. id returned in the response should be same id sent to you (Task Id -> <taskId> in json response)
2. Strictly return ONLY ONE OBJECT in the response tasks array.
3. You are allowed to use Markdown for the description of the task. You MUST ONLY use valid Markdown according to the following rules:
    ${MARKDOWN_RULES}

(!) return a list of task ONLY: no other headers, footers, or additional text

Please ensure that task name and acceptance criteria is clear, concise, and comprehensive. Output only valid JSON. Do not include \`\`\`json \`\`\` on start and end of the response.`;
}
