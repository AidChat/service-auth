import app from 'express';
import {login, register, sessionController} from "../controller/route/authentication";

const router = app.Router();

router.route('/login')
    .post(login);

router.route('/register')
    .post(register)

router.route('/session')
    .get(sessionController)

module.exports = router;