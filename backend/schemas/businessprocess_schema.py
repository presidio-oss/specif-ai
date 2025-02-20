from marshmallow import Schema, fields, validate


class CreateFlowChartSchema(Schema):
    id = fields.String(required=True)
    title = fields.String(required=True)
    description = fields.String(
        required=True,
        validate=validate.Length(min=5, error="Description must not be empty"),
    )
    selectedBRDs = fields.List(fields.String(), required=False)
    selectedPRDs = fields.List(fields.String(), required=False)


class CreateBusinessProcessSchema(Schema):
    reqt = fields.String(required=False)
    contentType = fields.String(required=True)
    id = fields.String(required=True)
    title = fields.String(required=False)
    addReqtType = fields.String(required=True)
    name = fields.String(required=True)
    description = fields.String(required=True)
    useGenAI = fields.Boolean(required=True)
    selectedBRDs = fields.List(fields.String(), required=False)
    selectedPRDs = fields.List(fields.String(), required=False)


class UpdateBusinessProcessSchema(Schema):
    updatedReqt = fields.String(required=False)
    contentType = fields.String(required=True)
    id = fields.String(required=True)
    title = fields.String(required=False)
    reqId = fields.String(required=True)
    reqDesc = fields.String(required=True)
    name = fields.String(required=True)
    description = fields.String(required=True)
    useGenAI = fields.Boolean(required=True)
    selectedBRDs = fields.List(fields.String(), required=False)
    selectedPRDs = fields.List(fields.String(), required=False)
