const { z } = require('zod');

const getSuggestionsSchema = z.object({
  name: z.string().nonempty(),
  description: z.string().nonempty(),
  type: z.string().nonempty(),
  requirement: z.string().nonempty(),
  suggestions: z.array(z.string()).optional(),
  selectedSuggestion: z.string().optional(),
  knowledgeBase: z.string().optional(),
});

module.exports = { getSuggestionsSchema };
