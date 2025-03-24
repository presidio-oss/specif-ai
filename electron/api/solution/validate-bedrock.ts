import { IpcMainInvokeEvent } from 'electron';
import { validateBedrockSchema, ValidateBedrockRequest, ValidateBedrockResponse } from '../../schema/solution/validate-bedrock.schema';
import { AmazonKnowledgeBaseRetriever } from '@langchain/aws';

export async function validateBedrock(event: IpcMainInvokeEvent, data: unknown): Promise<ValidateBedrockResponse> {
  try {
    console.log("kb bedrock", data)
    const validatedData = validateBedrockSchema.parse(data) as ValidateBedrockRequest;

    try {
      const retriever = new AmazonKnowledgeBaseRetriever({
        knowledgeBaseId: validatedData.kbId,
        topK: 1,
        region: validatedData.region,
        clientOptions: {
          credentials: {
            accessKeyId: validatedData.accessKey,
            secretAccessKey: validatedData.secretKey,
            ...(validatedData.sessionKey && { sessionToken: validatedData.sessionKey })
          }
        }
      });

      await retriever.invoke("test connection");
      return { isValid: true };
    } catch (error) {
      console.error('Failed to validate bedrock configuration:', error);
      return { isValid: false };
    }
  } catch (error) {
    console.error('Error in validateBedrock:', error);
    throw error;
  }
}
