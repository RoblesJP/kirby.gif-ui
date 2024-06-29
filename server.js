import express from "express";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import path from "path";
import { body, validationResult } from "express-validator";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";

import "dotenv/config";
// import * as dotenv from "dotenv";
// dotenv.config();

// Create a single supabase client for interacting with your database
const supabase = createClient(
  process.env["SUPABASE_URL"],
  process.env["SUPABASE_PUBLIC_KEY"]
);

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const __dirname = dirname(fileURLToPath(import.meta.url));
const port = 3000;

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "/public/index.html"));
});

app.post(
  "/audio",
  upload.single("file"),
  body("name").matches("^[_a-z]{1,32}$"),
  body("description").matches("^[a-zA-Z ]{1,32}$").notEmpty(),
  body("type").notEmpty(),
  async (req, res) => {
    const result = validationResult(req);

    if (!result.isEmpty())
      return res.status(400).json({ message: "Puto el que intenta hackearme" });

    if (!isFileValid(req.file))
      return res.status(400).json({ message: "El archivo no es valido." });

    const command = req.body;
    const audio = req.file;

    if (await commandNameTaken(command.name))
      return res.status(400).json({ message: "Command name already taken" });

    const uploadError = await uploadAudio(audio);
    if (uploadError) {
      console.log(uploadError);
      return res.status(500).json({ message: "Upload error" });
    }

    const creationError = await createCommand(
      command,
      "public/" + audio.originalname
    );
    if (creationError) {
      console.log(creationError);
      return res.status(500).json({ message: "Command creation error" });
    }

    return res.status(200).json({ message: "Command created" });
  }
);

app.post(
  "/gif",
  upload.none(),
  body("name").matches("^[_a-zA-Z]{1,32}$"),
  body("description").matches("^[a-zA-Z ]{1,32}$").notEmpty(),
  body("type").notEmpty(),
  body("url")
    .isURL({
      protocols: ["https"],
      require_host: true,
      host_whitelist: ["tenor.com", "www.tenor.com"],
    })
    .notEmpty(),
  async (req, res) => {
    const result = validationResult(req);

    if (!result.isEmpty())
      return res.status(400).json({ message: "Puto el que intenta hackearme" });

    const command = req.body;

    if (await commandNameTaken(command.name))
      return res.status(400).json({ message: "Command name already taken" });

    const creationError = await createCommand(command, command.url);

    if (creationError) {
      console.log(creationError);
      return res.status(500).json({ message: "Command creation error" });
    }

    return res.status(200).json({ message: "Command created" });
  }
);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

function isFileValid(file) {
  const expectedMIMEType = "audio/mpeg";
  const maximumSize = 1000000;

  return file.mimetype == expectedMIMEType && file.size <= maximumSize;
}

async function uploadAudio(audio) {
  const { data, error } = await supabase.storage
    .from("audios")
    .upload("public/" + audio.originalname, audio.buffer, {
      contentType: "audio/mpeg",
      cacheControl: "3600",
      upsert: false,
    });

  return error;
}

async function createCommand(command, resource_path) {
  const { error } = await supabase.from("commands").insert({
    name: command.name,
    description: command.description,
    type_id: command.type,
    resource_path: resource_path,
  });

  return error;
}

async function commandNameTaken(name) {
  let { data, error } = await supabase
    .from("commands")
    .select("name")
    .eq("enabled", true);

  if (error) {
    console.error(error);
    return true;
  }

  const names = data.map((x) => x.name);

  return names.includes(name);
}
