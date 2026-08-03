import { z } from 'zod';
export declare const registerSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name?: string;
    email?: string;
    password?: string;
}, {
    name?: string;
    email?: string;
    password?: string;
}>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email?: string;
    password?: string;
}, {
    email?: string;
    password?: string;
}>;
export declare const refreshSchema: z.ZodObject<{
    refreshToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    refreshToken?: string;
}, {
    refreshToken?: string;
}>;
export declare const updateProfileSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    username: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    bio: z.ZodOptional<z.ZodString>;
    birthday: z.ZodOptional<z.ZodString>;
    timezone: z.ZodOptional<z.ZodString>;
    language: z.ZodOptional<z.ZodString>;
    country: z.ZodOptional<z.ZodString>;
    occupation: z.ZodOptional<z.ZodString>;
    website: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    socialLinks: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    avatarUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    twoFactorEnabled: z.ZodOptional<z.ZodBoolean>;
    appearance: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    settings: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    username?: string;
    phone?: string;
    bio?: string;
    birthday?: string;
    timezone?: string;
    language?: string;
    country?: string;
    occupation?: string;
    website?: string;
    socialLinks?: Record<string, string>;
    avatarUrl?: string;
    twoFactorEnabled?: boolean;
    appearance?: Record<string, unknown>;
    settings?: Record<string, unknown>;
}, {
    name?: string;
    username?: string;
    phone?: string;
    bio?: string;
    birthday?: string;
    timezone?: string;
    language?: string;
    country?: string;
    occupation?: string;
    website?: string;
    socialLinks?: Record<string, string>;
    avatarUrl?: string;
    twoFactorEnabled?: boolean;
    appearance?: Record<string, unknown>;
    settings?: Record<string, unknown>;
}>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
