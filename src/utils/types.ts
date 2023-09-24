export const statusCodes: {
    [index: number]: {
        status: number,
        response: string
    }
} = {
    200: {
        "status": 200,
        "response": "OK"
    },
    201: {
        "status":
            201,
        "response":
            "Created"
    }
    ,
    204: {
        "status":
            204,
        "response":
            "No Content"
    }
    ,
    400: {
        "status":
            400,
        "response":
            "Bad Request"
    }
    ,
    401: {
        "status":
            401,
        "response":
            "Unauthorized"
    }
    ,
    403: {
        "status":
            403,
        "response":
            "Forbidden"
    }
    ,
    404: {
        "status":
            404,
        "response":
            "Not Found"
    }
    ,
    500: {
        "status":
            500,
        "response":
            "Internal Server Error"
    }
    ,
    502: {
        "status":
            502,
        "response":
            "Bad Gateway"
    }
    ,
    503: {
        "status":
            503,
        "response":
            "Service Unavailable"
    }
}
