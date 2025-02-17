from marshmallow import Schema, fields

class GenericChatSchema(Schema):
    message=fields.String(required=True)
    chatHistory=fields.List(fields.Dict, required=False)
    knowledgeBase=fields.String(required=False)

class ImproveSuggestionSchema(Schema):
    name=fields.String(required=True)
    description=fields.String(required=True)
    type=fields.String(required=True)
    requirement=fields.String(required=True)
    suggestions=fields.List(fields.String, required=True)
    selectedSuggestion=fields.String(required=False)
    knowledgeBase=fields.String(required=False)

class ConverseRequirementSchema(Schema):
    name=fields.String(required=True)
    description=fields.String(required=True)
    type=fields.String(required=True)
    requirement=fields.String(required=True)
    chatHistory=fields.List(fields.Dict, required=False)
    knowledgeBase=fields.String(required=False)
    userMessage=fields.String(required=True)
    requirementAbbr=fields.String(required=True)

class ConverseUserStoryTaskSchema(Schema):
    name=fields.String(required=True)
    description=fields.String(required=True)
    type=fields.String(required=True)
    requirement=fields.String(required=True)
    chatHistory=fields.List(fields.Dict, required=False)
    knowledgeBase=fields.String(required=False)
    userMessage=fields.String(required=True)
    prd=fields.String(required=True)
    us=fields.String(required=False)