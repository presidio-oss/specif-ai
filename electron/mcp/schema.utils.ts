export enum Type {
  STRING = "string",
  NUMBER = "number",
  INTEGER = "integer",
  BOOLEAN = "boolean",
  ARRAY = "array",
  OBJECT = "object",
  NULL = "null",
}

interface ProcessedSchema {
  type: Type;
  format?: string;
  title?: string;
  description?: string;
  nullable?: boolean;
  enum?: string[];
  maxItems?: string;
  minItems?: string;
  properties?: { [key: string]: ProcessedSchema };
  required?: string[];
  anyOf?: ProcessedSchema[];
  propertyOrdering?: string[];
  items?: ProcessedSchema;
  minimum?: number;
  maximum?: number;
}

function isValidFormat(type: Type, format?: string): boolean {
  if (!format) return true;

  switch (type) {
    case Type.STRING:
      return ["enum", "date-time"].includes(format);
    case Type.NUMBER:
      return ["float", "double"].includes(format);
    case Type.INTEGER:
      return ["int32", "int64"].includes(format);
    default:
      return false;
  }
}

export function processSchema(schema: any): ProcessedSchema | null {
  if (!schema || typeof schema !== "object") {
    return null;
  }

  // Regular schema processing
  if (!schema.type || !Object.values(Type).includes(schema.type)) {
    return null;
  }

  const processed: ProcessedSchema = {
    type: schema.type,
  };

  // Validate and process format if present
  if (schema.format && !isValidFormat(schema.type, schema.format)) {
    return null;
  }

  // Process supported fields
  if (schema.format) processed.format = schema.format;
  if (schema.title) processed.title = schema.title;
  if (schema.description) processed.description = schema.description;
  if (typeof schema.nullable === "boolean")
    processed.nullable = schema.nullable;

  // Process enum values for STRING type with enum format
  if (schema.type === Type.STRING && Array.isArray(schema.enum)) {
    processed.format = "enum";
    processed.enum = schema.enum;
  }

  // Process array-specific fields
  if (schema.type === Type.ARRAY) {
    if (schema.maxItems) processed.maxItems = schema.maxItems;
    if (schema.minItems) processed.minItems = schema.minItems;
    if (schema.items) {
      const processedItems = processSchema(schema.items);
      if (processedItems) {
        processed.items = processedItems;
      }
    }
  }

  // Process object-specific fields
  if (schema.type === Type.OBJECT) {
    if (schema.properties) {
      processed.properties = {};
      for (const [key, value] of Object.entries(schema.properties)) {
        const processedProperty = processSchema(value);
        if (processedProperty) {
          processed.properties[key] = processedProperty;
        }
      }
    }
    if (Array.isArray(schema.required)) {
      processed.required = schema.required;
    }
    if (Array.isArray(schema.propertyOrdering)) {
      processed.propertyOrdering = schema.propertyOrdering;
    }
  }

  // Process number/integer-specific fields
  if (schema.type === Type.NUMBER || schema.type === Type.INTEGER) {
    if (typeof schema.minimum === "number") processed.minimum = schema.minimum;
    if (typeof schema.maximum === "number") processed.maximum = schema.maximum;
  }

  // Process anyOf field
  if (Array.isArray(schema.anyOf)) {
    const processedAnyOf = schema.anyOf.map((subSchema: any) =>
      processSchema(subSchema)
    );
    const filteredAnyOf = processedAnyOf.filter(
      (s: ProcessedSchema | null) => s !== null
    );
    processed.anyOf = filteredAnyOf;
  }

  return processed;
}
