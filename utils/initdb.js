import db from "../db/db.js";
import fs from "fs";
import createDirname from "./createDirname.js";
import path from "path";

const initdb = () => {
  const __dirname = createDirname(import.meta.url);
  const dbPath = path.join(__dirname, "../db/events.db");
  if (!fs.existsSync(dbPath)) {
    const sql =
      "CREATE TABLE events(id, title, link, published, updated, summary, author, CONSTRAINT unique_id_constraint UNIQUE (id))";
    db.run(sql);
  }
};

export default initdb;
