import { z } from 'zod';
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
    search: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    sortOrder?: "asc" | "desc";
    limit?: number;
    page?: number;
    sortBy?: string;
    search?: string;
}, {
    sortOrder?: "asc" | "desc";
    limit?: number;
    page?: number;
    sortBy?: string;
    search?: string;
}>;
export type PaginationQuery = z.infer<typeof paginationSchema>;
export declare function getPaginationParams(query: PaginationQuery): {
    page: number;
    limit: number;
    skip: number;
};
export declare function buildPaginatedResponse<T>(data: T[], total: number, page: number, limit: number): {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasMore: boolean;
    };
};
export declare function getUserId(req: any): string;
export declare function startOfDay(date?: Date): Date;
export declare function endOfDay(date?: Date): Date;
export declare function daysAgo(days: number): Date;
export declare function startOfWeek(date?: Date): Date;
export declare function startOfMonth(date?: Date): Date;
