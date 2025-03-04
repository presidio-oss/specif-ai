# Third-party imports
from langchain_aws.retrievers import AmazonKnowledgeBasesRetriever

# Local application imports
from config.logging_config import logger


class LLMUtils:

    @staticmethod
    def prepare_messages(prompt, chat_history=None):
        """
        Prepares a formatted list of messages for the LLM, optionally including chat history.

        :param prompt: The main user query or instruction to be sent to the LLM.
        :param chat_history: Optional list of dictionaries containing previous chat messages.
                             Each dictionary should have role-content pairs,
                             e.g., {"role": "assistant", "content": "response"}.
        :return: A list of message dictionaries structured for LLM processing.
        :raises Exception: If the provided prompt is invalid (empty or not a string).
        """
        logger.info("Entering <LLMUtils.prepare_messages>")
        messages = []

        # Validate the prompt input
        if not (bool(prompt) and isinstance(prompt, str)):
            raise Exception("Invalid prompt provided.")

        # If chat history exists and is valid, format it appropriately
        if bool(chat_history) and isinstance(chat_history, list):
            for chat in chat_history:
                for key, value in chat.items():
                    messages.append({"role": key, "content": value})

        # Append the current user query to the message list
        messages.append({"role": "user", "content": prompt})

        logger.info("Exited <LLMUtils.prepare_messages>")
        return messages

    @staticmethod
    def retrieve_knowledge_base_content(knowledge_base_id: str, prompt: str):
        """
        Retrieves relevant knowledge base content based on the user prompt.

        :param knowledge_base_id: The unique identifier for the knowledge base from which content is retrieved.
        :param prompt: The query used to fetch relevant content from the knowledge base.
        :return: A list of knowledge base content relevant to the query.
        :raises Exception: If the `knowledge_base_id` or `prompt` is empty or invalid.
        """
        logger.info("Entering <LLMUtils.retrieve_knowledge_base_content>")

        # Validate the knowledge base ID
        knowledge_base_id = knowledge_base_id.strip()
        if not bool(knowledge_base_id):
            raise Exception('Knowledge base ID cannot be empty.')

        # Validate the user query
        prompt = prompt.strip()
        if not bool(prompt):
            raise Exception('Prompt cannot be empty.')

        # Initialize the knowledge base retriever with search configurations
        retriever = AmazonKnowledgeBasesRetriever(
            knowledge_base_id=knowledge_base_id,
            retrieval_config={"vectorSearchConfiguration": {"numberOfResults": 4}}
        )

        # Fetch relevant knowledge base content
        result = retriever.invoke(prompt)
        references = [i.dict()['page_content'] for i in result]

        logger.info("Exited <LLMUtils.retrieve_knowledge_base_content>")
        return references

    @staticmethod
    def generate_knowledge_base_prompt_constraint(knowledge_base_id: str, prompt: str):
        """
        Generates a prompt with strict constraints based on the retrieved knowledge base content.

        :param knowledge_base_id: The unique identifier for the knowledge base.
        :param prompt: The original user query or instruction.
        :return: A modified prompt that includes knowledge base references as strict constraints.
        """
        logger.info("Entering <LLMUtils.generate_knowledge_base_prompt_constraint>")

        # Retrieve knowledge base content to include in the prompt
        knowledge_base_content = LLMUtils.retrieve_knowledge_base_content(knowledge_base_id, prompt)

        # Structure the prompt to prioritize the retrieved references
        knowledge_base_message = (
                "\n\nConsider these references as strict constraints:\n" +
                "\n".join(knowledge_base_content) +
                "\n\nMake sure all responses adhere to these strict exclusivity rules."
        )

        # Append the user query to the structured reference message
        prompt = knowledge_base_message + "\n\nUser Query:\n" + prompt

        logger.info("Exited <LLMUtils.generate_knowledge_base_prompt_constraint>")
        return prompt
