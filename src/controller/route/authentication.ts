import {responseHandler} from "../../utils/response-handler";
import {Request, Response} from "express";
import {config} from "../../utils/appConfig";
import {hasher} from "../../utils/methods";
import axios from "axios";
import {imageUpload, url} from "../../network/sources";
import {User} from "@prisma/client";


/**
 * @param request
 * @param response
 */
export function login(request: Request, response: Response) {
    try {
        let {email, password, extend, requestId} = request.body;
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
                        responseHandler(404, response, {message: 'User does not exists.'})
                    } else {
                        const {data} = await hasher._verify(result.password)
                        if (password === data) {
                            if (extend) {
                                hasher.expire = '7d'
                            }
                            const sessionId = hasher._createSession(result.email,result.id);
                            config._query.session.upsert({
                                    where: {
                                        id: result?.Session?.id ? result.Session.id : 0
                                    },
                                    update:
                                        {
                                            session_id: sessionId,
                                            extended: extend
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
                                if (requestId) {
                                    config._query.request.findFirst({where: {id: requestId}})
                                        .then((res: any) => {
                                            if (res) {
                                                config._query.group.update({
                                                    where: {id: res.groupId},
                                                    data: {User: {connect: result}},
                                                    include: {User: true}
                                                })
                                                    .then((groupUpdate: any) => {
                                                        config._query.request.delete({where: {id: res.id}})
                                                            .then(() => {
                                                                config._query.role.create({
                                                                    data: {
                                                                        userId: result.id,
                                                                        groupId: groupUpdate.id,
                                                                        type:res.role
                                                                    }
                                                                })
                                                                    .then(() => {
                                                                        responseHandler(200, response, {data: {session: session}});
                                                                    })
                                                            })
                                                    })
                                                    .catch((error: any) => {
                                                        responseHandler(200, response, {data: {session: session}});
                                                    })
                                            } else {
                                                responseHandler(200, response, {data: {session: session}});
                                            }
                                        })
                                        .catch((e: any) => {
                                            console.log(e);
                                            responseHandler(200, response, {data: {session: session}});
                                        })
                                } else {
                                    responseHandler(200, response, {data: {session: session}});
                                }
                            }).catch((e: any) => {

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
        const {email, password, name, requestId} = request.body;
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
                    const sessionId = hasher._createSession(email,data.id);
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
                    }).then((user: any) => {
                        delete user.password;
                        // create own group
                        let selfGroup: { name: string, description: string, keywords: string[] } = {
                            name: "Notes",
                            description: "Private group for storing notes.",
                            keywords: ['PRIVATE']
                        }
                        JSON.stringify(selfGroup);
                        axios.post(`${url['_host_group']}/group`, selfGroup, {headers: {'session': user.Session.session_id}});
                        if (requestId) {
                            config._query.request.findFirst({where: {id: requestId}})
                                .then((result: any) => {
                                    if (result && (result.invitee === user.email)) {
                                        config._query.group.update({
                                            where: {id: result.groupId},
                                            data: {User: {connect: user}},
                                            include: {User: true}
                                        })
                                            .then((groupUpdate: any) => {
                                                config._query.request.delete({where: {id: result.id}})
                                                    .then(() => {
                                                        config._query.role.create({
                                                            data: {
                                                                userId: user.id,
                                                                groupId: groupUpdate.id,
                                                                type:result.role
                                                            }
                                                        })
                                                            .then(() => {
                                                                responseHandler(200, response, {data: result});
                                                            })
                                                    })


                                            })
                                            .catch((error: any) => {
                                                responseHandler(200, response, {data: result});
                                            })
                                    } else {
                                        responseHandler(200, response, {data: result});
                                    }
                                })
                                .catch((e: any) => {
                                    console.log(e);
                                    responseHandler(200, response, {data: user});
                                })
                        }
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
                responseHandler(200, response, {message: "Session valid", data: {email: result}})
            })
                .catch((reason: any) => {
                    console.log(session)
                    responseHandler(403, response, {message: "Session timeout"})
                })
        }
    } catch (e) {
        console.log(e)
        responseHandler(503, response, {message: "Please try again later"})
    }
}

export function removeSessionController(request: Request, response: Response) {
    try {
        let session = request.headers.session;
        config._query.session.delete({where: {session_id: session}})
            .then(() => {
                responseHandler(200, response, {message: "Session removed"});
            })
            .catch((e: any) => {
                console.log(e);
                responseHandler(200, response, {message: "Request failed. Please try again later!"})
            })
    } catch (e) {
        responseHandler(503, response, {message: "Please try again later"})
    }
}

export function updateProfile(request: Request, response: Response) {
    try {
        const {profileImage, name} = request.body;
        let imageUrl: string = ''
        const email = request.body.user.email;
        config._query.user.findFirst({where: {email:email}})
            .then((res: User) => {
                if (res) {
                    if (profileImage) {
                        imageUpload(profileImage, '_profile' + res.name, (data: any) => {
                            imageUrl = data.url;
                            config._query.user.update({where: {email: email},
                                data: {
                                    profileImage: imageUrl,
                                    name: name
                                }
                            }).then((result: any) => {
                                responseHandler(200, response, {data: result})
                            })
                                .catch((error: any) => {
                                    console.log(error)
                                })
                        })
                    } else {
                        config._query.user.update({
                            where: { email: email },
                            data: {
                                name: name
                            }
                        }).then((result: any) => {
                            responseHandler(200, response, {data: result})
                        })
                            .catch((error: any) => {
                                responseHandler(503,response,{message:"Please try again later"});
                            })
                    }
                } else {
                    responseHandler(404, response, {message: 'User not found'});
                }
            })
            .catch((error: any) => {
                console.log(error)
                responseHandler(404, response, {message: "User not found"});
            })
    }catch (e) {
        console.log(e);
        responseHandler(503,response,{message:"Please try again later"});
    }
}