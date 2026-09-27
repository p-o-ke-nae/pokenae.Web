import Ajv2020, { type ErrorObject, type ValidateFunction } from "ajv/dist/2020";
import addFormats from "ajv-formats";

export type ValidationIssue = {
  path: Array<string | number>;
  message: string;
};

type JsonSchema = {
  title?: string;
  oneOf?: JsonSchema[];
  [key: string]: unknown;
};

function parseSchema(source: string, title?: string): JsonSchema {
  const schema = JSON.parse(source) as JsonSchema;
  if (!title) return schema;
  const selected = schema.oneOf?.find((candidate) => candidate.title === title);
  if (!selected) throw new Error(`canonical schema に ${title} 定義がありません。`);
  return selected;
}

function issuePath(error: ErrorObject): Array<string | number> {
  const path = error.instancePath
    .split("/")
    .slice(1)
    .map((part) => decodeURIComponent(part.replace(/~1/g, "/").replace(/~0/g, "~")))
    .map((part) => /^\d+$/.test(part) ? Number(part) : part);
  if (error.keyword === "required" && typeof error.params.missingProperty === "string") {
    path.push(error.params.missingProperty);
  }
  if (error.keyword === "additionalProperties" && typeof error.params.additionalProperty === "string") {
    path.push(error.params.additionalProperty);
  }
  return path;
}

function compile(source: string, title?: string): ValidateFunction {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  return ajv.compile(parseSchema(source, title));
}

export function validateCanonicalJson(source: string, value: unknown, title?: string): ValidationIssue[] {
  const validate = compile(source, title);
  if (validate(value)) return [];
  return (validate.errors ?? []).map((error) => ({
    path: issuePath(error),
    message: error.message ?? "schema に適合しません。",
  }));
}

export function validateCanonicalItems(source: string, values: readonly unknown[]): ValidationIssue[] {
  const validate = compile(source);
  return values.flatMap((value, index) => {
    if (validate(value)) return [];
    return (validate.errors ?? []).map((error) => ({
      path: [index, ...issuePath(error)],
      message: error.message ?? "schema に適合しません。",
    }));
  });
}
