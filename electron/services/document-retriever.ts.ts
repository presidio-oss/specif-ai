import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/huggingface_transformers";

export class DocumentRetriever {
  private static readonly embeddingsModel =
    new HuggingFaceTransformersEmbeddings({
      model: "Xenova/all-MiniLM-L6-v2",
    });

  private static vectorDatabase: FaissStore | null = null;

  static async initializeVectorStore(text: string): Promise<FaissStore> {
    this.vectorDatabase = null;
    const document = new Document({ pageContent: text });
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const splitDocuments = await textSplitter.splitDocuments([document]);
    this.vectorDatabase = await FaissStore.fromDocuments(
      splitDocuments,
      this.embeddingsModel
    );

    return this.vectorDatabase;
  }

  static async searchSimilarDocuments(
    query: string,
    topK: number = 3
  ): Promise<Document[]> {
    if (!this.vectorDatabase) {
      throw new Error(
        "Vector database is not initialized. Please process a document first."
      );
    }

    return this.vectorDatabase.similaritySearch(query, topK);
  }
}
