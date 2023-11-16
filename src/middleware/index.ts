import {hasher} from "../utils/methods";
import {NextFunction, Request, Response} from "express";

export function verifyClient(request:Request,_: any,next:NextFunction) {
    try {
        let token = request.headers.session;
        if (!token) {
            const err: Error = new Error("Not authorized");
            throw err
        }
        if (token) {
            hasher._verify(token).then((response: any) => {
                request.body.user = {
                    email : response.data
                }
                next();
            })
                .catch(() => {
                    const err: Error = new Error("Token expired")
                    next(err);
                })
        }
    } catch (e: any) {
        const err: Error = new Error(e.message);
        next(err);
    }
}