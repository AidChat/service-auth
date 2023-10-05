import app from 'express';
import {verifyClient} from "../middleware";
import {getUserDetails} from "../controller/route/user";

export const router = app.Router();
router.route('/')
    .get(verifyClient, getUserDetails)


module.exports = router;