import express, {Express, Request, Response} from 'express';
import dotenv from 'dotenv';
import {config} from "./utils/appConfig";
import cors from 'cors';
import {v2 as cloudinary} from 'cloudinary';
import {imageUpload} from "./network/sources";
import NodeCache from "node-cache";
dotenv.config();


const app: Express = express();
const port = process.env.PORT;
const authentication = require('./routes/authentication');
const user  = require('./routes/user')


cloudinary.config({
    cloud_name: 'marcrove',
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

export const cache = new NodeCache();



app.use(cors())
app.use(express.json())
app.get(config._urlParser('/'), (req: Request, res: Response) => {
   res.send(config._service)
});

app.use(config._urlParser('/auth'), authentication);
app.use(config._urlParser('/user'),user)

app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});