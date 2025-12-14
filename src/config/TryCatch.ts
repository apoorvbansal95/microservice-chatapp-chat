import type { NextFunction, Request, RequestHandler, Response } from "express";

export const TryCatch = (handler: RequestHandler): RequestHandler => {
    // Promise.resolve(func(req, res, next)).catch(next);
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await handler(req, res, next)
        }
        catch (err: any) {
            res.status(500).json({ message: err.message })
        }
    }
};

export default TryCatch