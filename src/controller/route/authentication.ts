import {responseHandler} from "../../utils/response-handler";
import {Request, Response} from "express";
import {config} from "../../utils/appConfig";
import {hasher} from "../../utils/methods";
import axios from "axios";
import {url} from "../../network/sources";


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
                },
                include: {
                    Session: true
                }
            }).then(async (result: any) => {
                    if (!result) {
                        responseHandler(404, response, {message: 'Please register first'})
                    } else {
                        const {data} = await hasher._verify(result.password)
                        console.log(data, password)
                        if (password === data) {
                            if (extend) {
                                hasher.expire = '2d'
                            }
                            const sessionId = hasher._createSession(result.email);
                            config._query.session.upsert({
                                    where: {
                                        id: result.Session.id ? result.Session.id : 0
                                    },
                                    update:
                                        {
                                            session_id:sessionId
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
                    const sessionId = hasher._createSession(email);
                    config._query.user.create({
                        data: {
                            email: email,
                            password: hashedPassword,
                            name: name,
                            Session: {
                                create: {
                                    session_id: sessionId
                                }
                            },
                        },
                        include: {
                            Session: true
                        }
                    }).then((result: any) => {
                        delete result.password;
                        // create own group
                        let selfGroup: { name: string, description: string, keywords: string[] } = {
                            name: "Notes",
                            description: "Private group for storing note.",
                            keywords: []
                        }
                        JSON.stringify(selfGroup)
                        axios.post(`${url['_host_group']}/group`, selfGroup, {headers: {'session': result.Session.session_id}})
                        responseHandler(200, response, {data: result});
                    }).catch((e: any) => {
                        console.log(e)
                        responseHandler(502, response, {message: 'Please try again later'});
                    })
                }
            })
        }
    } catch (e) {
        responseHandler(500, response);
    }
}

export function sessionController(request: Request, response: Response) {
    try {
        let session = request.headers.session;
        if (!session) {
            responseHandler(400, response, {message: "No session found"});
        } else {
            hasher._verify(session).then((result: any) => {
                responseHandler(200,response,{message:"Session valid"})
            })
                .catch((reason: any) => {
                    console.log(session)
                    responseHandler(403,response,{message:"Session timeout"})
                })
        }
    } catch (e) {
        console.log(e)
        responseHandler(503, response, {message: "Please try again later"})
    }
}