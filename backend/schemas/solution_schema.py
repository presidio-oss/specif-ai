from marshmallow import Schema, fields, validate


class RequirementGenerationLimitSchema(Schema):
    max_count = fields.Integer(required=True)
    isEnabled = fields.Boolean(required=True)


class CreateSolutionSchema(Schema):
    name = fields.String(required=True, validate=validate.Length(min=1))
    description = fields.String(required=True, validate=validate.Length(min=1))
    frontend = fields.Boolean(required=False)
    backend = fields.Boolean(required=False)
    database = fields.Boolean(required=False)
    deployment = fields.Boolean(required=False)
    createReqt = fields.Boolean(required=False)
    created_on = fields.DateTime(required=False)
    cleanSolution = fields.Boolean(required=False)
    brdPreferences = fields.Nested(RequirementGenerationLimitSchema, required=True)
    prdPreferences = fields.Nested(RequirementGenerationLimitSchema, required=True)
    nfrPreferences = fields.Nested(RequirementGenerationLimitSchema, required=True)
    uirPreferences = fields.Nested(RequirementGenerationLimitSchema, required=True)


class SolutionIdSchema(Schema):
    id = fields.String(required=True)
