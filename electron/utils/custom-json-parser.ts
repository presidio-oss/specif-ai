import { jsonrepair } from "jsonrepair";

/**
 * Function to extract requirements from LLM response without fully parsing as JSON
 * This handles multiline strings and preserves markdown formatting
 */
export function extractRequirementsFromResponse(
  response: string,
  requirementType: string
): any[] {
  try {
    try {
      let processedResponse = response;
      // For cases where the output json is wrapped in ```json\n<content>\n``` - observed with gemini models
      const jsonWrapperMatch = response.match(/```json\n(.*?)\n```/s);

      if (jsonWrapperMatch != null) {
        processedResponse = jsonWrapperMatch[1];
      }

      const parsedJson = JSON.parse(processedResponse);
      if (
        parsedJson[requirementType] &&
        Array.isArray(parsedJson[requirementType])
      ) {
        return parsedJson[requirementType];
      }
    } catch (jsonError) {
      console.log(
        `[create-solution] Standard JSON parsing failed, using regex extraction`
      );
    }

    const requirements: any[] = [];

    const regex =
      /"id"\s*:\s*"([^"]+)"\s*,\s*"title"\s*:\s*"([^"]+)"\s*,\s*"requirement"\s*:\s*"([\s\S]*?)(?:"\s*})/g;

    let match;
    while ((match = regex.exec(response)) !== null) {
      const [_, id, title, requirement] = match;

      const processedRequirement = requirement
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");

      requirements.push({
        id,
        title,
        requirement: processedRequirement,
      });
    }

    if (requirements.length > 0) {
      return requirements;
    }

    console.log(`[create-solution] Regex extraction failed, using raw text`);
    return [
      {
        id: `${requirementType.toUpperCase()}1`,
        title: `Generated ${requirementType.toUpperCase()} Content`,
        requirement: response,
      },
    ];
  } catch (error) {
    console.error(`[create-solution] Error extracting requirements:`, error);
    return [];
  }
}

export function repairJSON(input: string) {
  return jsonrepair(input);
}
