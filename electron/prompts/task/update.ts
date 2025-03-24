import { MARKDOWN_RULES } from '../context/markdown-rules';

export interface UpdateTaskPromptParams {
  name: string;
  description: string;
  taskId: string;
  taskName: string;
  existingTaskDescription: string;
  taskDescription: string;
  fileContent: string;
}

export function updateTaskPrompt(params: UpdateTaskPromptParams): string {
  return `You are a senior architect tasked with updated existing task from the provided client input. Below is all the information that you need to derive a task.

User Story Name:
${params.name}

User Story Description:
${params.description}

Task Id:
${params.taskId}

Existing Task Description:
${params.existingTaskDescription}

Client Request - Task Name:
${params.taskName}

Client Request - Task Description:
${params.taskDescription}

FileContent:
${params.fileContent}

Update the existing task by incorporating the client's requests and the information from the provided file content. 
Ensure that the revised task is clear, concise, and comprehensive.

The task should be strictly derived from the provided user story description and client request and any information from the file content, with no additional or irrelevant information included. 
The "Client Request - Task Description" can be expanded to derive acceptance criteria based on provided input but DO NOT include additional or irrelevant content.
An apt task name should be generated based on the updated acceptance criteria.

STRICT:
(!) Ensure to categorize the task as frontend, backend, API integration, UX screens, Infra changes if applicable.
(!) Output Structure should be a valid JSON: Here is the sample Structure. Follow this exactly. Don't add or change the response JSON

# RESPONSE FORMAT EXAMPLE
{
    "tasks": [
        {
            "id": "<taskId>"
            "<task name>": "[description of the task]  \\n#### Acceptance Criteria:  \\n[acceptance criteria for the task as sentences]"
        }
    ]
}

Special Instructions:
1. id returned in the response should be same id sent to you (Task Id -> <taskId> in json response)
2. Strictly return ONLY ONE OBJECT in the response tasks array.
3. You are allowed to use Markdown for the description of the task. You MUST ONLY use valid Markdown according to the following rules:
    ${MARKDOWN_RULES}

STRICT:
(!) return a list of task ONLY: no other headers, footers, or additional text

Please ensure the task name and acceptance criteria is clear, concise, and comprehensive. Output only valid JSON. Do not include \`\`\`json \`\`\` on start and end of the response.`;
}
