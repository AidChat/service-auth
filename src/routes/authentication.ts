import app from 'express';
import {login, register} from "../controller/route/authentication";

const router = app.Router();

router.route('/login')
    .post(login);

router.route('/register')
    .post(register)

module.exports = router;