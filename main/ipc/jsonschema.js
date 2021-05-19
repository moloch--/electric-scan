"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jsonSchema = void 0;
const Ajv = require("ajv");
// jsonSchema - A JSON Schema decorator, somewhat redundant given we're using TypeScript
// but it provides a stricter method of validating incoming JSON messages than simply
// casting the result of JSON.parse() to an interface.
function jsonSchema(schema) {
    const ajv = new Ajv({ allErrors: true });
    schema["additionalProperties"] = false;
    const validate = ajv.compile(schema);
    return (target, propertyKey, descriptor) => {
        const originalMethod = descriptor.value;
        descriptor.value = (arg) => {
            const valid = validate(JSON.parse(arg));
            if (valid) {
                return originalMethod(arg);
            }
            else {
                console.error(arg);
                console.error(validate.errors);
                return Promise.reject(`Invalid schema: ${ajv.errorsText(validate.errors)}`);
            }
        };
        return descriptor;
    };
}
exports.jsonSchema = jsonSchema;
//# sourceMappingURL=jsonschema.js.map