import app from 'express';
import {verifyClient} from "../middleware";
import {getUserDetails} from "../controller/route/user";
import {SetUserType, updateProfile} from "../controller/route/authentication";

export const router = app.Router();
router.route('/')
    .get(verifyClient, getUserDetails)
    .put(verifyClient,updateProfile)

router.route('/consent')
    .put(verifyClient,SetUserType)

module.exports = router;