import express from "express";
import cors from "cors";
import Joi from "joi";
import dayjs from "dayjs";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const server = express();
server.use(cors());
server.use(express.json());

const mongoClient = new MongoClient(process.env.DATABASE_URL);
try {
  await mongoClient.connect();
} catch (err) {
  console.log(err.message);
}
const db = mongoClient.db();

server.post("/participants", async (req, res) => {
  const { name } = req.body;
  const schema = Joi.string().required();
  if (schema.validate(name).error) {
    return res.sendStatus(422);
  }

  try {
    const user = await db.collection("participants").findOne({ name: name });
    if (user) {
      return res.sendStatus(409);
    }
    await db
      .collection("participants")
      .insertOne({ name: name, lastStatus: Date.now() });
    await db.collection("messages").insertOne({
      from: name,
      to: "Todos",
      text: "entra na sala...",
      type: "status",
      time: dayjs().format("HH:mm:ss"),
    });
    res.sendStatus(201);
  } catch (err) {
    console.log(err.message);
  }
});

server.get("/participants", async (req, res) => {
  try {
    const users = await db.collection("participants").find().toArray();
    res.send(users);
  } catch (err) {
    console.log(err.message);
  }
});

server.post("/messages", async (req, res) => {
  const { to, text, type } = req.body;
  const { user } = req.headers;
  const schemaForStrings = Joi.string().required();
  const schemaForTypes = Joi.string()
    .valid("message", "private_message")
    .required();

  try {
    const u = await db.collection("participants").findOne({ name: user });
    if (!u) {
      return res.sendStatus(422);
    }
    if (
      schemaForStrings.validate(to).error ||
      schemaForStrings.validate(text).error ||
      schemaForTypes.validate(type).error
    ) {
      return res.sendStatus(422);
    }
    await db.collection("messages").insertOne({
      from: user,
      to,
      text,
      type,
      time: dayjs().format("HH:mm:ss"),
    });
    res.sendStatus(201);
  } catch (err) {
    console.log(err.message);
  }
});

server.get("/messages", async (req, res) => {
  const { user } = req.headers;
  const { limit } = req.query;

  try {
    const msgs = await db
      .collection("messages")
      .find({
        $or: [
          { type: "message" },
          { to: "Todos" },
          { to: user },
          { from: user },
        ],
      })
      .toArray();
    if (!limit) {
      return res.send(msgs);
    }
    const numberLimit = Number(limit);
    if (numberLimit === 0 || numberLimit < 0 || isNaN(numberLimit) === true) {
      res.sendStatus(422);
    } else {
      res.send(msgs.slice(-numberLimit));
    }
  } catch (err) {
    console.log(err.message);
  }
});

server.post("/status", async (req, res) => {
  const { user } = req.headers;
  if (!user) {
    return res.sendStatus(404);
  }

  try {
    const userDB = await db.collection("participants").findOne({ name: user });
    if (!userDB) {
      return res.sendStatus(404);
    }
    await db
      .collection("participants")
      .updateOne({ name: userDB.name }, { $set: { lastStatus: Date.now() } });
    res.sendStatus(200);
  } catch (err) {
    console.log(err.message);
  }
});

async function clearParticipantsList() {
  const dezSegundos = 10000;

  try {
    const participants = await db.collection("participants").find().toArray();
    participants.forEach(async (p) => {
      const tempoPassado = Date.now() - p.lastStatus;
      if (tempoPassado > dezSegundos) {
        await db.collection("participants").deleteOne({ name: p.name });
        await db.collection("messages").insertOne({
          from: p.name,
          to: "Todos",
          text: "sai da sala...",
          type: "status",
          time: dayjs().format("HH:mm:ss"),
        });
      }
    });
  } catch (err) {
    console.log(err.message);
  }
}
setInterval(clearParticipantsList, 15000);

const PORT = 5000;
server.listen(PORT, console.log(`Server running on port ${PORT}`));
