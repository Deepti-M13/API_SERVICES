// =============================================================
// Life OS — Validation Middleware
// Zod schema validation for request body, query, and params
// =============================================================
import { ZodError } from 'zod';
import { ValidationError } from '../errors/index.js';
export function validate(schemas) {
    return (req, _res, next) => {
        try {
            if (schemas.body) {
                req.body = schemas.body.parse(req.body);
            }
            if (schemas.query) {
                Object.defineProperty(req, 'query', {
                    value: schemas.query.parse(req.query),
                    enumerable: true,
                    writable: true
                });
            }
            if (schemas.params) {
                Object.defineProperty(req, 'params', {
                    value: schemas.params.parse(req.params),
                    enumerable: true,
                    writable: true
                });
            }
            next();
        }
        catch (error) {
            if (error instanceof ZodError) {
                const details = error.errors.map((e) => ({
                    field: e.path.join('.'),
                    message: e.message,
                    code: e.code,
                }));
                next(new ValidationError(details));
            }
            else {
                next(error);
            }
        }
    };
}
//# sourceMappingURL=validate.middleware.js.map