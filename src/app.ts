import express, {Express, Request, Response} from 'express';
import dotenv from 'dotenv';
import {config} from "./utils/appConfig";
import bodyParser from "body-parser";
dotenv.config();

const app: Express = express();
const port = process.env.PORT;
const authentication = require('./routes/authentication');

app.use(express.json())
app.get(config._urlParser('/'), (req: Request, res: Response) => {
   res.send(config._service)
});

app.use(config._urlParser('/auth'), authentication);


app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});