import express from "express";
import cors from "cors";
import { router as login } from "./api/login";
import { router as register } from "./api/register";
import { router as search } from "./api/search";
import { router as hotel } from "./api/hotel";
import { router as artist } from "./api/artist";
import { router as restaurant } from "./api/restaurant"
import { router as event } from "./api/event"
import { router as roomshare } from "./api/roomshare";
import { router as user } from "./api/user";

import bodyParser from "body-parser";

export const app = express();
app.use(express.json());
app.use(bodyParser.text());
app.use(bodyParser.json());


// app.use("/", (req, res) => {
//   res.send("Hello World!!!");
// });

app.use(
    cors({
      origin: "*",
    })  
  );
  
  app.use("", login);
  app.use("", register);
  app.use("", search);
  app.use("", hotel);
  app.use("", artist);
  app.use("", restaurant);
  app.use("", event);
  app.use("", roomshare);
  app.use("", user);