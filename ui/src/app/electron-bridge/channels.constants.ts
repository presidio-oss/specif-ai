export const DOCUMENT_CHANNELS = {
    GET_DOCUMENT_BY_COUNT: 'document:getDocumentTypesWithCount',
    GET_DOCUMENT: 'document:getDocument',
    GET_ALL_DOCUMENTS: 'document:getAllDocuments',
    ADD_DOCUMENT: 'document:addDocument',
    UPDATE_DOCUMENT: 'document:updateDocument',
    ENHANCE_DOCUMENT: 'document:enhanceDocument',
    GENERATE_STORIES: 'document:generateStories',
    GENERATE_TASKS: 'document:generateTasks',
}

export const SOLUTION_CHANNELS = {
    GET_SOLUTION_METADATA: 'solution:getSolutionMetadata',
    GET_SOLUTION_INTEGRATIONS: 'solution:getSolutionIntegrations',
}

export const BUSINESS_PROCESS_CHANNELS = {
    GET_BUSINESS_PROCESS_COUNT: 'businessProcess:getCount',
    GET_BUSINESS_PROCESS: 'businessProcess:get',
    GET_ALL_BUSINESS_PROCESSES: 'businessProcess:getAll',
    GET_FLOWCHART: 'businessProcess:getFlowchart',
    GENERATE_FLOWCHART: 'businessProcess:generateFlowchart',
    ENHANCE_BUSINESS_PROCESS: 'businessProcess:enhance',
    ADD_BUSINESS_PROCESS: 'businessProcess:add',
    UPDATE_BUSINESS_PROCESS: 'businessProcess:update',
}

export const AI_CHAT_CHANNELS = {
    GET_SUGGESTIONS: 'aiChat:getSuggestions',
    GET_CHAT_HISTORY: 'aiChat:getChatHistory',
    CHAT: 'aiChat:chat',
}