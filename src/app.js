import express from "express";
import cors from "cors";
import Joi from "joi";
import dayjs from "dayjs";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const participants = [];
const messages = [];

const server = express();
server.use(cors());
server.use(express.json());

let db;
const mongoClient = new MongoClient(process.env.DATABASE_URL);
mongoClient
  .connect()
  .then(() => (db = mongoClient.db()))
  .catch((err) => console.log(err.message));

server.post("/participants", (req, res) => {
  const { name } = req.body;
  const schema = Joi.string().required();
  if (schema.validate(name).error) {
    return res.sendStatus(422);
  }
  db.collection("participants")
    .findOne({ name: name })
    .then((user) => {
      if (user !== null) {
        res.sendStatus(409);
      } else {
        db.collection("participants")
          .insertOne({ name: name, lastStatus: Date.now() })
          .catch((err) => console.log(err.message));
        db.collection("messages")
          .insertOne({
            from: name,
            to: "Todos",
            text: "entra na sala...",
            type: "status",
            time: dayjs().format("HH:mm:ss"),
          })
          .catch((err) => console.log(err.message));
        res.sendStatus(201);
      }
    })
    .catch((err) => console.log(err.message));
});

server.get("/participants", (req, res) => {
  db.collection("participants")
    .find()
    .toArray()
    .then((users) => res.send(users))
    .catch((err) => console.log(err.message));
});

server.post("/messages", (req, res) => {
  const { to, text, type } = req.body;
  const { from } = req.headers;
  const schemaForStrings = Joi.string().required();
  const schemaForTypes = Joi.string()
    .valid("message", "private_message")
    .required();
  db.collection("participants")
    .findOne({ name: from })
    .then((user) => {
      if (user === null) {
        res.sendStatus(422);
      } else {
        if (
          schemaForStrings.validate(to).error ||
          schemaForStrings.validate(text).error ||
          schemaForTypes.validate(type).error
        ) {
          return res.sendStatus(422);
        }
        db.collection("messages")
          .insertOne({
            from,
            to,
            text,
            type,
            time: dayjs().format("HH:mm:ss"),
          })
          .catch((err) => console.log(err.message));
        res.sendStatus(201);
      }
    })
    .catch((err) => console.log(err.message));
});

server.get("/messages", (req, res) => {
  const { user } = req.headers;
  const { limit } = req.query;
  db.collection("messages")
    .find({
      $or: [{ type: "message" }, { to: "Todos" }, { to: user }, { from: user }],
    })
    .toArray()
    .then((msgs) => {
      if (!limit) {
        res.send(msgs);
      } else {
        const numberLimit = Number(limit);
        if (
          numberLimit === 0 ||
          numberLimit < 0 ||
          isNaN(numberLimit) === true
        ) {
          res.sendStatus(422);
        } else {
          res.send(msgs.slice(-numberLimit));
        }
      }
    })
    .catch((err) => console.log(err.message));
});

server.post("/status", (req, res) => {
  const { user } = req.headers;
  if (!user) {
    return res.sendStatus(404);
  }
  db.collection("participants")
    .findOne({ name: user })
    .then((user) => {
      if (user === null) {
        res.sendStatus(404);
      } else {
        db.collection("participants")
          .updateOne({ name: user.name }, { $set: { lastStatus: Date.now() } })
          .then(res.sendStatus(200))
          .catch((err) => console.log(err.message));
      }
    })
    .catch((err) => console.log(err.message));
});

const PORT = 5001;
server.listen(PORT, console.log(`Server running on port ${PORT}`));
