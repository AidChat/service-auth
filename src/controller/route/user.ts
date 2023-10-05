import {Request, Response} from "express";
import {config} from "../../utils/appConfig";
import {User} from "@prisma/client";
import {responseHandler} from "../../utils/response-handler";

export function getUserDetails(request: Request, response: Response) {
    try {
        let {email} = request.body.user;
        config._query.user.findUnique({
            where: {
                email: email
            }
        })
            .then((result: User) => {
                // @ts-ignore
                delete result.password
                responseHandler(200, response, {data: result});
            })
            .catch((reason: any) => {
                responseHandler(503, response, {message: 'Please try again later'});
            })
    } catch (e) {
        responseHandler(503, response, {message: "Please try again later"});
    }
}