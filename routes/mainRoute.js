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

mainRoute
  .route("/")
  // This endpoint returns the atom file with all of our local data
  .get((req, res, next) => {
    let allRows = [];

    // Iterate through each URL and fetch Atom data
    Promise.all(
      atomURLs.map((url) => fetchAtomData(url))
    )
      .then((atomDataArray) => {
        // Concatenate all Atom data arrays into one array
        allRows = atomDataArray.flat();

      //setting the header information for the ATOM file
      let feed = new Feed({
        title: "Events Feed",
        author: {
          name: "FDLA Class",
        },
      });

      //Add each databse entry into the atom file
      rows.forEach((row) => {
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
          res.status(200).sendFile(atomFilePath);
        }
      });
    });
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
        return next(err);
      }
    );

    res.status(200).send("New record entered");
  });

// Injests information from outside Atom files and adds it to our DB
mainRoute.route("/atom").put((req, res) => {
  const atomURL = req.body.atomURL;
  fetch(atomURL)
    .then((response) => response.text())
    .then((str) => {
      parseString(str, function (err, result) {
        const atomData = extractAtomData(result);

        atomData.forEach((data) => {
          const { id, title, link, published, updated, summary, author } = data;

          sql = `INSERT INTO events(id, title, link, published, updated, summary, author) VALUES (?,?,?,?,?,?,?)`;
          db.run(
            sql,
            [id, title, link, published, updated, summary, author.name[0]],
            (err) => {
              next(err);
            }
          );

          res.status(200).send("New ATOM file entered");
        });
      });
    });
});

// Function to fetch Atom data from a given URL
async function fetchAtomData(url) {
  try {
    const response = await fetch(url);
    const xmlString = await response.text();
    return new Promise((resolve, reject) => {
      parseString(xmlString, (err, result) => {
        if (err) reject(err);
        const atomData = extractAtomData(result);
        resolve(atomData);
      });
    });
  } catch (error) {
    return Promise.reject(error);
  }
}

export default mainRoute;
