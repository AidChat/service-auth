import {v2 as cloudinary} from 'cloudinary';
export const url   =  {
    _host_authentication:'http://127.0.0.1:8999/v1',
    _host_group : 'http://127.0.0.1:8901/v1',
    _host_messaging:'http://127.0.0.1:8900/v1'
}


export function imageUpload(data:string,name:string,onDone:(data:any)=>void){
    cloudinary.uploader.upload(data,
        { public_id: name,
        folder:'aidchat'
        },
        function(error: any, result: any) { onDone(result)});
}