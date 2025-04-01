import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/huggingface_transformers";

export class DocumentRetriever {
  private static readonly embeddings = new HuggingFaceTransformersEmbeddings({
    model: "Xenova/all-MiniLM-L6-v2",
  });

  private static vectorStore: FaissStore | null = null;

  /**
   * Initialize or re-initialize the vector store with new text
   */
  static async initializeVectorStore(
    text: string,
    projectDir: string
  ): Promise<void> {
    this.reset();
    const document = new Document({ pageContent: text });
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const splitDocuments = await textSplitter.splitDocuments([document]);
    this.vectorStore = await FaissStore.fromDocuments(
      splitDocuments,
      this.embeddings
    );

    await this.saveVectorStore(projectDir);
  }

  /**
   * Save the current vector store to disk
   */
  private static async saveVectorStore(projectDir: string): Promise<void> {
    if (!this.vectorStore) {
      throw new Error("Vector store has not been initialized");
    }
    await this.vectorStore.save(projectDir);
  }

  /**
   * Search for similar documents to the query
   */
  static async searchSimilarDocuments(
    query: string,
    topK: number = 3
  ): Promise<string> {
    if (!this.vectorStore) {
      throw new Error(
        "Vector store not found. Run initializeVectorStore first."
      );
    }

    const relevantDocs = await this.vectorStore.similaritySearch(query, topK);
    return relevantDocs.map((doc) => doc.pageContent).join("\n\n");
  }

  /**
   * Reset the vector store instance
   */
  static reset(): void {
    this.vectorStore = null;
  }
}
