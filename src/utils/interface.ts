import {Request, Response} from "express";

export interface generalProps  {
    req:Request,
    res:Response
}
export enum EtemplateID{
    email  = 'template_xf3fx9k',
    otp = 'template_7w2tozv'
}