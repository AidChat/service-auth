import app from 'express';
import {
    login,
    register,
    removeSessionController,
    sessionController,
    SocialLogin
} from "../controller/route/authentication";
import {verifyClient} from "../middleware";

const router = app.Router();

router.route('/login')
    .post(login);

router.route('/register')
    .post(register)

router.route('/session')
    .get(verifyClient,sessionController)
    .delete(verifyClient,removeSessionController)

router.route('/social-login')
    .post(SocialLogin)


module.exports = router;