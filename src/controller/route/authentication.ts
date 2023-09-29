import {responseHandler} from "../../utils/response-handler";
import {Request, Response} from "express";
import {config} from "../../utils/appConfig";
import {hasher} from "../../utils/methods";


/**
 * @param request
 * @param response
 */
export function login(request: Request, response: Response) {
    try {
        let {email, password, extend} = request.body;
        if (!email || !password) {
            responseHandler(400, response, {message: 'Please provide required inputs'});
        } else {
            config._query.user.findUnique({
                where: {
                    email: email
                }
            }).then((result: any) => {
                    if (!result) {
                        responseHandler(404, response, {message: 'Please register first'})
                    } else {
                        const data = hasher._verify(result.password);
                        const storePassword = data.data;
                        if (password === storePassword) {
                            if (extend) {
                                hasher.expire = '2d'
                            }
                            const sessionId = hasher._createSession(result.email);
                            config._query.session.upsert({
                                    where: {
                                        id: result.sessionId ? result.sessionId : 0
                                    },
                                    update:
                                        {
                                            session_id:sessionId,
                                            extended : extend
                                        }
                                    ,
                                    create: {
                                        session_id: sessionId,
                                        extended: extend,
                                        User: {
                                            connect: {
                                                id: result.id
                                            }
                                        }
                                    }
                                }
                            ).then((session: any) => {
                                responseHandler(200, response, {data: {session: session}});
                            }).catch((e: any) => {
                                console.log(e);
                                responseHandler(500, response, {message: "Please try again later"})

                            })
                        } else {
                            responseHandler(403, response, {message: 'Invalid credentials'})
                        }
                    }
                }
            )
        }
    } catch
        (e) {
        responseHandler(500, response);
    }
}

/**
 * @param request
 * @param response
 */
export async function register(request: Request, response: Response) {
    try {
        const {email, password, name} = request.body;
        if (!email || !password || !name) {
            responseHandler(400, response, {message: 'Please provide required inputs'});
        } else {
            config._query.user.findUnique({
                where: {
                    email: email
                }
            }).then((data: any) => {
                if (data) {
                    responseHandler(403, response, {message: 'User already exists'});
                } else {
                    const hashedPassword: string = hasher._hash(password);
                    config._query.user.create({
                        data: {
                            email: email,
                            password: hashedPassword,
                            name: name
                        }
                    }).then((result: any) => {
                        delete result.password;
                        responseHandler(200, response, {data: result});
                    }).catch((e: any) => {
                        responseHandler(502, response, {message: 'Please try again later'});
                    })
                }
            })
        }
    } catch (e) {
        responseHandler(500, response);
    }
}
