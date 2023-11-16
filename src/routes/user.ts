import app from 'express';
import {verifyClient} from "../middleware";
import {getUserDetails} from "../controller/route/user";
import {updateProfile} from "../controller/route/authentication";

export const router = app.Router();
router.route('/')
    .get(verifyClient, getUserDetails)
    .put(verifyClient,updateProfile)


module.exports = router;