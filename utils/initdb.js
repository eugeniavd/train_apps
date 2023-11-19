const initdb = () => {
  const __dirname = createDirname(import.meta.url);
  const dbPath = path.join(__dirname, "../db/events.db");
  if (!fs.existsSync(dbPath)) {
    const sql = `
      CREATE TABLE events(
        id TEXT PRIMARY KEY,
        title TEXT,
        link TEXT,
        published TEXT,
        updated TEXT,
        summary TEXT,
        author TEXT,
        source_url TEXT,
        CONSTRAINT unique_id_constraint UNIQUE (id)
      )
    `;
    db.run(sql);
  }
};

export default initdb;

