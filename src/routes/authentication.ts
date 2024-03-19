import app from 'express';
import {
    createCode,
    login,
    register,
    removeSessionController,
    sessionController,
    SocialLogin, verifyCode
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

router.route('/code')
    // verify code
    .post(verifyCode)
    // request for a code
    .put(createCode)


module.exports = router;