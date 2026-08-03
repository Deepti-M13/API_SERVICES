export declare class AppError extends Error {
    readonly statusCode: number;
    readonly code: string;
    readonly isOperational: boolean;
    readonly details?: unknown;
    constructor(message: string, statusCode?: number, code?: string, details?: unknown);
}
export declare class BadRequestError extends AppError {
    constructor(message?: string, details?: unknown);
}
export declare class UnauthorizedError extends AppError {
    constructor(message?: string);
}
export declare class ForbiddenError extends AppError {
    constructor(message?: string);
}
export declare class NotFoundError extends AppError {
    constructor(resource?: string);
}
export declare class ConflictError extends AppError {
    constructor(message?: string);
}
export declare class ValidationError extends AppError {
    constructor(details: unknown);
}
export declare class RateLimitError extends AppError {
    constructor(message?: string);
}
