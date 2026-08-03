import { Request, Response, NextFunction } from 'express';
export interface JwtPayload {
    userId: string;
    email: string;
    iat?: number;
    exp?: number;
}
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}
export declare function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void>;
export declare function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void>;
