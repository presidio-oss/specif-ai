from marshmallow import Schema, fields


class AppSchema(Schema):
    name = fields.String(required=True)
    description = fields.String(required=True)
    technicalDetails = fields.String(required=True)


class BRDItemSchema(Schema):
    id = fields.String(required=True)
    title = fields.String(required=True)
    requirement = fields.String(required=True)


class CreatePRDsSchema(Schema):
    brds = fields.List(fields.Nested(BRDItemSchema), required=False, load_default=list)
    app = fields.Nested(AppSchema, required=True)
    extraContext = fields.String(required=False)
