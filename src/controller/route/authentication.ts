import {responseHandler} from "../../utils/response-handler";
import {Request, Response} from "express";
import {config} from "../../utils/appConfig";
import {hasher} from "../../utils/methods";
import axios from "axios";
import {imageUpload, url} from "../../network/sources";
import {User} from "@prisma/client";
import {sendEmail} from "../../functions";
import {cache} from "../../app";


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
                }, include: {
                    Session: true
                }
            }).then(async (result: any) => {

                if (!result) {
                    responseHandler(404, response, {message: 'User not found. Please register first'})
                } else {
                    if (!result.password) {
                        // social login case
                        return responseHandler(404, response, {message: 'User does not exists.'})

                    }
                    const {data} = await hasher._verify(result.password)
                    if (password === data) {
                        if (extend) {
                            hasher.expire = '7d'
                        }
                        const sessionId = hasher._createSession(result.email, result.id);
                        config._query.session.upsert({
                            where: {
                                id: result?.Session?.id ? result.Session.id : 0
                            }, update: {
                                session_id: sessionId, extended: extend
                            }, create: {
                                session_id: sessionId, extended: extend, User: {
                                    connect: {
                                        id: result.id
                                    }
                                }
                            }
                        }).then((session: any) => {
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
                                                                    type: res.role
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
            })
        }
    } catch (e) {
        responseHandler(500, response);
    }
}

/**\
 * @param request
 * @param response
 */
export async function register(request: Request, response: Response) {
    try {
        let {email, password, name, requestId, mobile} = request.body;
        if (!email || !password || !name) {
            responseHandler(400, response, {message: 'Please provide required inputs'});
        } else {
            if (password.split('').length < 8) {
                return responseHandler(403, response, {message: 'Password should be more than 8 characters'});
            }
            config._query.user.findUnique({
                where: {
                    email: email
                }
            }).then((data: any) => {
                if (data) {
                    responseHandler(403, response, {message: 'User already exists. Please login'});
                } else {
                    const hashedPassword: string = hasher._hash(password);
                    config._query.user.create({
                        data: {
                            email: email, password: hashedPassword, name: name, mobile: mobile
                        }
                    }).then(async (user: any) => {
                        const sessionId = hasher._createSession(email, user.id);
                        user.Session = await config._query.session.create({
                            data: {
                                session_id: sessionId, extended: false, userId: user.id
                            }
                        });

                        delete user.password;
                        // create own group
                        let selfGroup: { name: string, description: string, keywords: string[] } = {
                            name: "Notes", description: "Private group for storing notes.", keywords: ['PRIVATE']
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
                                                                type: result.role
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
                        } else {
                            sendEmail({email: user.email}).then(function () {
                                responseHandler(200, response, {message: 'User registered, please verify your email address'});
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


export async function createCode(request: Request, response: Response) {
    try {
        const {email} = request.body;
        const cachedRequest: { times: number, code: number } | undefined = cache.get(email);
        if (cachedRequest && cachedRequest?.times > 5) {
            responseHandler(403, response, {message: "Please try again after 30 minutes"});
        } else {
            await sendEmail({email});
            responseHandler(200, response, {message: "Otp generated"});
        }
    } catch (e) {
        responseHandler(500, response, {message: "Please try again later."})
    }
}

export async function verifyCode(request: Request, response: Response) {
    try {
        const {code, email} = request.body;
        let cachedValue: { times: number, code: number } | undefined = cache.get(email);
        if (cachedValue) {
            if (cachedValue?.code === parseInt(code)) {
                cache.del(email);
                await config._query.user.update({where:{email},data:{verifiedEmail:true}})
                responseHandler(200, response, {});
            }else{
                responseHandler(404, response, {message: "Invalid code"})
            }
        } else {
            responseHandler(404, response, {message: "Invalid code"})
        }

    } catch (e) {
        responseHandler(500, response, {message: "Please try again later."})
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
        const {profileImage, name, about, mobile} = request.body;
        let imageUrl: string = ''
        const email = request.body.user.email;
        config._query.user.findFirst({where: {email: email}})
            .then((res: User) => {
                if (res) {
                    if (profileImage) {
                        imageUpload(profileImage, '_profile' + res.name, (data: any) => {
                            imageUrl = data.url;
                            config._query.user.update({
                                where: {email: email}, data: {
                                    profileImage: imageUrl, name: name, about: about, mobile
                                }
                            }).then((result: any) => {
                                console.log(result);
                                responseHandler(200, response, {data: result})
                            })
                                .catch((error: any) => {
                                    console.log(error)
                                })
                        })
                    } else {
                        config._query.user.update({
                            where: {email: email}, data: {
                                name: name, about, mobile
                            }
                        }).then((result: any) => {
                            responseHandler(200, response, {data: result})
                        })
                            .catch((error: any) => {
                                responseHandler(503, response, {message: "Please try again later"});
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
    } catch (e) {
        console.log(e);
        responseHandler(503, response, {message: "Please try again later"});
    }
}

export function SocialLogin(request: Request, response: Response) {
    const {access_token, scope, requestId} = request.body;
    if (!access_token || !scope) {
        return responseHandler(403, response, {message: "Unauthorized"})
    } else {
        axios
            .get(`https://www.googleapis.com/oauth2/v3/userinfo?alt=json?access_token=${access_token}`, {
                headers: {
                    Authorization: `Bearer ${access_token}`, Accept: 'application/json'
                }
            })
            .then((res) => {

                let userdata = res.data;
                if (userdata) {
                    let email = userdata.email;
                    config._query.user.findUnique({
                        where: {
                            email: email
                        }
                    }).then(result => {
                        if (result) {
                            const sessionId = hasher._createSession(result.email, result.id);
                            config._query.session.upsert({
                                where: {
                                    id: result?.Session?.id ? result.Session.id : 0
                                }, update: {
                                    session_id: sessionId, extended: true
                                }, create: {
                                    session_id: sessionId, extended: true, User: {
                                        connect: {
                                            id: result.id
                                        }
                                    }
                                }
                            }).then((session: any) => {
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
                                                                        type: res.role
                                                                    }
                                                                })
                                                                    .then(() => {
                                                                        config._query.joining.create({
                                                                            data: {
                                                                                timestamp: new Date(),
                                                                                userId: result.id,
                                                                                groupId: res.groupId,
                                                                            }
                                                                        })
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

                            })
                        } else {
                            config._query.user.create({
                                data: {
                                    email: userdata.email, name: userdata.name,
                                }
                            }).then(result => {
                                const sessionId = hasher._createSession(result.email, result.id);
                                config._query.session.upsert({
                                    where: {
                                        id: result?.Session?.id ? result.Session.id : 0
                                    }, update: {
                                        session_id: sessionId, extended: true
                                    }, create: {
                                        session_id: sessionId, extended: true, User: {
                                            connect: {
                                                id: result.id
                                            }
                                        }
                                    }
                                }).then((session: any) => {
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
                                                                            type: res.role
                                                                        }
                                                                    })
                                                                        .then(() => {
                                                                            config._query.joining.create({
                                                                                data: {
                                                                                    timestamp: new Date(),
                                                                                    userId: result.id,
                                                                                    groupId: res.groupId,
                                                                                }
                                                                            })
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
                                })

                            })
                                .catch((error) => {
                                    console.log(error)
                                })
                        }
                    })


                    // create a user record

                } else {
                    responseHandler(403, response, {message: "Unauthorized"})
                }
            })
            .catch((err) => console.log(err));
    }

}

export function SetUserType(request: Request, response: Response) {
    try {
        let user = request.body.user;
        let {type} = request.body;
        config._query.user.findUnique({where: {id: user.user_id}}).then(result => {
            if (result.Type !== 'Pending') {
                responseHandler(403, response, {message: 'User  already have a role for using this Aidchat. We request you to request for account deletion and signup again'})
            } else {
                config._query.user.update({where: {id: user.user_id}, data: {Type: type}})
                    .then(() => {
                        responseHandler(200, response, {message: "Consent saved."});
                    }).catch((e) => {
                    console.log(e)
                    responseHandler(500, response, {message: "Please try again"});
                })
            }
        })

    } catch (e) {
        console.log(e)
        responseHandler(500, response, {message: "Please try again"});

    }
}