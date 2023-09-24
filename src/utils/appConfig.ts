import {PrismaClient} from "@prisma/client";

const appConfig = {
    _version: 'v1',
    _urlParser: function (url: string) {
        return '/' + this._version + url;
    },
    _service: 'service-authentication',
    // in js getters are only used to access properties of an object
    _query :  new PrismaClient()


};

export const config = Object.create(appConfig);


