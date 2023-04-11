import express from "express";
import cors from "cors";
import Joi from "joi";
import dayjs from "dayjs";

const participants = [];
const messages = [];

const server = express();
server.use(cors());
server.use(express.json());

server.post("/participants", (req, res) => {
  const { name } = req.body;
  const schema = Joi.string().empty();
  if (schema.validate(name).error) {
    return res.sendStatus(422);
  }
  if (participants.find((p) => p.name === name)) {
    return res.sendStatus(409);
  }
  participants.push({ name, lastStatus: Date.now() });
  messages.push({
    from: name,
    to: "Todos",
    text: "entra na sala...",
    type: "status",
    time: dayjs().format("HH:mm:ss"),
  });
  res.sendStatus(201);
});

server.get("/participants", (req, res) => {
  res.send(participants);
});

server.post("/messages", (req, res) => {
  const { to, text, type } = req.body;
  const { from } = req.headers;
  const schema = Joi.string().empty();
  if (
    schema.validate(to).error ||
    schema.validate(text).error ||
    type !== ("message" && "private_message")
  ) {
    return res.sendStatus(422);
  }
  messages.push({
    from,
    to,
    text,
    type,
    time: dayjs().format("HH:mm:ss"),
  });
  res.sendStatus(201);
});

server.get("/messages", (req, res) => {
    const {User} = req.headers;
    const {limit} = req.query;
});

server.post("/status", (req, res) => {
    const {User} = req.headers;
    if(!User){
        return res.sendStatus(404);
    }
});

const PORT = 5001;
server.listen(PORT, console.log(`Server running on port ${PORT}`));
