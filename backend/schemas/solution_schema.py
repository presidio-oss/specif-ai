from marshmallow import Schema, fields, validate


class GenerationCountRangeSchema(Schema):
    min_count = fields.Integer(required=True, validate=validate.Range(min=1))
    max_count = fields.Integer(required=True, validate=validate.Range(min=30))


class CreateSolutionSchema(Schema):
    name = fields.String(required=True, validate=validate.Length(min=1))
    description = fields.String(required=True, validate=validate.Length(min=1))
    frontend = fields.Boolean(required=False)
    backend = fields.Boolean(required=False)
    database = fields.Boolean(required=False)
    deployment = fields.Boolean(required=False)
    createReqt = fields.Boolean(required=False)
    created_on = fields.DateTime(required=True)
    brd = fields.Nested(GenerationCountRangeSchema, required=True)
    prd = fields.Nested(GenerationCountRangeSchema, required=True)
    nfr = fields.Nested(GenerationCountRangeSchema, required=True)
    uir = fields.Nested(GenerationCountRangeSchema, required=True)


class SolutionIdSchema(Schema):
    id = fields.String(required=True)
