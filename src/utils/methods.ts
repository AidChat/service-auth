const jwt = require('jsonwebtoken');
const hasherObj: {
    hash: string | null,
    _createSession: (s:string,i:number) => void,
    expire :string,
    expiry:string,
    _hash : (s:string) => string,
    _verify : (k:string) => Promise<any>,
    key:string | undefined
} = {
    hash: null,
    expiry : '4h',
    key : process.env.KEY ? process.env.KEY  : 'default',
    set expire(time : '1h'| '4h' | '10h' | '2d' | '7d'){
           this.expiry = time;
    },
    _createSession : function(userName: string,userId:number) {
        return jwt.sign({
            data: userName,
            user_id : userId
        }, this.key,{expiresIn:this.expiry})
    },
    _verify: function(key:string) : Promise<any> {
        return new Promise((resolve,reject)=>{
            try {
                let data = jwt.verify(key, this.key)
                resolve(data);
            }catch (e) {
                reject(e)
            }
        })

    },
    _hash : function(str:string){
        return jwt.sign({
            data: str
        }, this.key);
    }
}
export const hasher = Object.create(hasherObj);