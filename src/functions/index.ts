import {mail} from "../utils/mailer";
import {EtemplateID} from "../utils/interface";
import NodeCache from "node-cache";
import {cache} from "../app";

export function sendEmail({email}) {
    let rand = Math.floor(1000 + Math.random() * 9000);
    let cachedValue :{ code: number; times: number } | undefined = cache.get(email);
    if(cachedValue){
        cachedValue.code = rand;
        cachedValue.times = cachedValue.times+ 1;
        cache.set(email, cachedValue,1800);
    }else{
        cache.set(email,{code:rand,times:0})
    }
    return mail({otp: rand, template: EtemplateID.otp, email})
}

