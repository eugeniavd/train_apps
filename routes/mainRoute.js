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
  // Your list of Atom feed URLs
];

// Function to fetch Atom data from a given URL with retry mechanism and increased timeout
async function fetchAtomDataWithRetry(url, maxRetries = 2, timeout = 60000) {
  // Function implementation (as previously provided)
}

// Function to fetch Atom data from a given URL
async function fetchAtomData(url) {
  // Function implementation (as previously provided)
}

mainRoute
  .route("/")
  .get(async (req, res, next) => {
    let allRows = [];
    const sourceURL = req.query.sourceURL || "default"; // Source URL obtained from the request

    try {
      const atomDataArray = await Promise.all(
        atomURLs.map((url) => fetchAtomDataWithRetry(url))
      );

      // Processing fetched data
      allRows = atomDataArray.map((xmlString) => {
        let rows = [];
        parseString(xmlString, function (err, result) {
          if (err) {
            console.error(`Error parsing XML: ${err.message}`);
            return next(err);
          }
          rows = extractAtomData(result);
        });
        return rows;
      }).flat();

      let feed = new Feed({
        title: "Events Feed",
        author: {
          name: "FDLA Class",
        },
      });

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

        // Inserting data into the database with source URL
        const currentDate = new Date();
        sql = `INSERT INTO events(id, title, link, published, updated, summary, author, source_url) VALUES (?,?,?,?,?,?,?,?)`;
        db.run(
          sql,
          [randomUUID(), title, link, currentDate, currentDate, summary, author, sourceURL],
          (err) => {
            if (err) {
              console.error(`Error inserting into DB: ${err.message}`);
              return next(err);
            }
            console.log("New record with source URL entered successfully");
          }
        );
      });

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
    const sourceURL = req.query.sourceURL || "default"; // Source URL obtained from the request

    if (!title || !link || !summary || !author) {
      return next(createHttpError(400, "Missing Information. Fill out missing fields and try again."));
    }

    sql = `INSERT INTO events(id, title, link, published, updated, summary, author, source_url) VALUES (?,?,?,?,?,?,?,?)`;
    db.run(
      sql,
      [randomUUID(), title, link, currentDate, currentDate, summary, author, sourceURL],
      (err) => {
        if (err) {
          console.error(`Error in POST request: ${err.message}`);
          return next(err);
        }
        console.log("New record with source URL entered successfully");
        res.status(200).send("New record entered");
      }
    );
  });

mainRoute.route("/atom").put(async (req, res, next) => {
  const atomURL = req.body.atomURL;
  const sourceURL = req.query.sourceURL || "default"; // Source URL obtained from the request

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

        sql = `INSERT INTO events(id, title, link, published, updated, summary, author, source_url) VALUES (?,?,?,?,?,?,?,?)`;
        db.run(
          sql,
          [id, title, link, published, updated, summary, author.name[0], sourceURL],
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