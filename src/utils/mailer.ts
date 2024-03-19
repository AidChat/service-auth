import emailjs from '@emailjs/nodejs';
import {EtemplateID} from "./interface";

export function mail({link,email,template,otp}: { link?: string, email?: string,template:EtemplateID,otp?:number }): Promise<any> {
    const templateParams = {
        link: link,
        email: email,
        code:otp,
    };
    const serviceID = process.env.MAIL_serviceID ? process.env.MAIL_serviceID : ''
    const templateID = template;
    const pubK = process.env.MAIL_publicKey ? process.env.MAIL_publicKey : '';
    const privK = process.env.MAIN_privateKey ? process.env.MAIN_privateKey : ''
    return emailjs
        .send(serviceID, templateID, templateParams, {
            publicKey: pubK,
            privateKey: privK,
        })

}

