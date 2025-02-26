from marshmallow import Schema, ValidationError, fields, validate


class GenerationCountRangeSchema(Schema):
    generationCountRange = fields.List(fields.Integer(), validate=validate.Length(equal=2))


class RootRequirementGenerationPreferencesSchema(Schema):
    brd = fields.Nested(GenerationCountRangeSchema)
    prd = fields.Nested(GenerationCountRangeSchema)
    nfr = fields.Nested(GenerationCountRangeSchema)
    uir = fields.Nested(GenerationCountRangeSchema)


class CreateSolutionSchema(Schema):
    name = fields.String(required=True, validate=validate.Length(min=1))
    description = fields.String(required=True, validate=validate.Length(min=1))
    frontend = fields.Boolean(required=False)
    backend = fields.Boolean(required=False)
    database = fields.Boolean(required=False)
    deployment = fields.Boolean(required=False)
    createReqt = fields.Boolean(required=False)
    created_on = fields.DateTime(required=True)
    rootRequirementGenerationPreferences = fields.Nested(RootRequirementGenerationPreferencesSchema, required=True)


class SolutionIdSchema(Schema):
    id = fields.String(required=True)
