import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken"

interface IUser extends Document {
    _id: string,
    name: string,
    email: string
}

export interface AuthencatedRequest extends Request {
    user?: IUser | null
}

export const isAuth = async (req: AuthencatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers.authorization
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({ message: "Plese login first  auth error" })
            return
        }

        const token = authHeader.split(" ")[1]
        const JWT_SECRET = process.env.JWT_SECRET as string

        const decodedValue = jwt.verify(token as string, JWT_SECRET) as JwtPayload
        if (!decodedValue || !decodedValue.user) {
            res.status(401).json({
                message: "Invalid token"
            })
            return
        }
        req.user = decodedValue.user
        next()

    }
    catch (err) {
        console.log(err)
        res.status(401).json({ message: "Please login first jwt error" })
    }
}

export default isAuth