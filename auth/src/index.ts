require("dotenv").config();

import express from "express";
import passport from "passport";
import { Strategy } from "passport-discord";
import session from "express-session";
import cors from "cors";
import morgan = require("morgan");
import { URL } from "url";
import { issueJwt, JwtStrategy } from "./jwt";

const port = process.env.PORT || 4000;
const app = express();

passport.use(
  new Strategy(
    {
      clientID: process.env.YUN_OAUTH_ID!,
      clientSecret: process.env.YUN_OAUTH_SECRET!,
      callbackURL: process.env.YUN_OAUTH_CALLBACK,
      scope: ["identify"]
    },
    (_, __, profile, cb) => {
      cb(null, profile.id);
    }
  )
);

passport.use(JwtStrategy);

passport.serializeUser((id, done) => {
  done(null, id);
});

passport.deserializeUser((id, done) => {
  done(null, id);
});

app.use(
  cors({
    credentials: false,
    origin: "*",
    allowedHeaders: ["Authorization", "Content-Type"],
    maxAge: 60 * 60 * 24 * 7
  })
);
app.use(morgan(process.env.NODE_ENV === "prod" ? "short" : "dev"));
app.use(passport.initialize());
app.use(passport.session());

app.get("/", (req, res) => {
  res.send({ test: "yes" });
});

app.get("/login", passport.authenticate("discord"));
app.get("/callback", passport.authenticate("discord"), (req, res) => {
  const destination =
    process.env.YUN_WEBSITE_REDIRECT || "http://localhost:4040/dashboard";

  if (!req.user) {
    res.status(403);
    res.redirect(destination);
  }

  const token = issueJwt(req.user);
  res.header("Authorization", `Bearer ${token}`);
  const redirect = new URL(destination);

  redirect.searchParams.append("token", token);

  res.redirect(redirect.toString());
});

app.get("/auth", passport.authenticate("jwt", { session: false }), (req, res) =>
  res.sendStatus(200)
);

app.get(
  "/hasura",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const { userId } = req.user;
    return res.send({
      "X-Hasura-User-Id": userId,
      "X-Hasura-Role": "user"
    });
  }
);

app.listen(port, () => {
  console.log("Running...");
});