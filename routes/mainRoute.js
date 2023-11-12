import { Feed } from "feed";
import fs from "fs";
import path from "path";
import { Router } from "express";
import db from "../db/db.js";
import createDirname from "../utils/createDirname.js";
import { randomUUID } from "crypto";
import { parseString } from "xml2js";
import extractAtomData from "../utils/extractAtomData.js";
import createHttpError from "http-errors";
import fetch from "node-fetch";

const mainRoute = Router();
const __dirname = createDirname(import.meta.url);
const atomFilePath = path.join(__dirname, "../atomfile/atom.xml");
let sql;
const atomURLs = [
  "https://gioele.uber.space/k/fdla2023/feed1.atom",
  "https://fdla-atom-feed.xyz/feed",
  "https://fdla-event-manager.fly.dev/feed",
  "http://juvicha.pythonanywhere.com/atom.xml",
  "https://fdla-backend-project.onrender.com/",
];

// Function to fetch Atom data from a given URL with retry mechanism and increased timeout
async function fetchAtomDataWithRetry(url, maxRetries = 2, timeout = 60000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt} to fetch data from: ${url}`);
      const response = await fetch(url, { timeout });
      console.log(`Response status for attempt ${attempt}: ${response.status}`);
      return await response.text();
    } catch (error) {
      console.error(`Attempt ${attempt} failed. Error: ${error.message}`);
      if (attempt < maxRetries) {
        console.log(`Retrying...`);
        continue;
      } else {
        throw error;
      }
    }
  }
}

// Function to fetch Atom data from a given URL
async function fetchAtomData(url) {
  try {
    console.log(`Fetching data from: ${url}`);
    const response = await fetch(url);
    console.log(`Response status: ${response.status}`);
    return await response.text();
  } catch (error) {
    throw error;
  }
}

mainRoute
  .route("/")
  .get(async (req, res, next) => {
    let allRows = [];

    try {
      // Iterate through each URL and fetch Atom data
      const atomDataArray = await Promise.all(
        atomURLs.map((url) => fetchAtomDataWithRetry(url))
      );

      // Concatenate all Atom data arrays into one array
      allRows = atomDataArray.flat();

      // Setting the header information for the ATOM file
      let feed = new Feed({
        title: "Events Feed",
        author: {
          name: "FDLA Class",
        },
      });

      // Add each database entry into the atom file
      allRows.forEach((row) => {
        const { title, link, id, published, updated, summary, author } = row;
        feed.addItem({
          title: title,
          id: id,
          link: link,
          date: new Date(updated),
          published: new Date(published),
          summary: summary,
          author: [
            {
              name: author,
            },
          ],
        });
      });

      // Write to the file, and if the write is successful, send it
      fs.writeFile(atomFilePath, feed.atom1(), (err) => {
        if (err) next(err);
        else {
          console.log("ATOM file written successfully");
          res.status(200).sendFile(atomFilePath);
        }
      });
    } catch (error) {
      console.error(`Error in GET request: ${error.message}`);
      next(error);
    }
  })
  .post((req, res, next) => {
    const currentDate = new Date();
    const { title, link, summary, author } = req.body;
    if (!title || !link || !summary || !author) {
      return next(createHttpError(400, "Missing Information. Fill out missing fields and try again."));
    }

    sql = `INSERT INTO events(id, title, link, published, updated, summary, author) VALUES (?,?,?,?,?,?,?)`;
    db.run(
      sql,
      [randomUUID(), title, link, currentDate, currentDate, summary, author],
      (err) => {
        if (err) {
          console.error(`Error in POST request: ${err.message}`);
          return next(err);
        }
        console.log("New record entered successfully");
        res.status(200).send("New record entered");
      }
    );
  });

mainRoute.route("/atom").put(async (req, res, next) => {
  const atomURL = req.body.atomURL;

  try {
    const xmlString = await fetchAtomDataWithRetry(atomURL);
    parseString(xmlString, function (err, result) {
      if (err) {
        console.error(`Error parsing XML: ${err.message}`);
        return next(err);
      }

      const atomData = extractAtomData(result);

      atomData.forEach((data) => {
        const { id, title, link, published, updated, summary, author } = data;

        sql = `INSERT INTO events(id, title, link, published, updated, summary, author) VALUES (?,?,?,?,?,?,?)`;
        db.run(
          sql,
          [id, title, link, published, updated, summary, author.name[0]],
          (err) => {
            if (err) {
              console.error(`Error inserting into DB: ${err.message}`);
              return next(err);
            }
            console.log("New ATOM file entry entered successfully");
            res.status(200).send("New ATOM file entered");
          }
        );
      });
    });
  } catch (error) {
    console.error(`Error in PUT request: ${error.message}`);
    next(error);
  }
});

export default mainRoute;
