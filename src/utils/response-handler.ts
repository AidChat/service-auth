import {Response} from "express";
import {statusCodes} from "./types";

/**
 * @param status
 * @param res
 * @param data
 */
export function responseHandler(status : number, res: Response, data ?: {message?:string,data?:any}) {
    res.status(status).json({data, response : statusCodes[status]});
}