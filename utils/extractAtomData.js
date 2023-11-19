const extractAtomData = (rawAtomData, sourceURL) => {
  let processedData = [];
  const atomData = rawAtomData.feed.entry;

  atomData.forEach((data) => {
    const { title, link, id, published, updated, summary, author } = data;

    let entryTitle = title?.[0];
    let entrySummary = summary?.[0];

    if (title?.[0]?.["_"]) {
      entryTitle = title[0]["_"];
    }
    if (summary?.[0]?.["_"]) {
      entrySummary = summary[0]["_"];
    }

    let individualEntry = {
      title: typeof entryTitle === "string"? entryTitle : "",
      link: link?.[0]?.$?.href || "",
      id: id?.[0] || "",
      published: published?.[0] || "",
      updated: updated?.[0] || "",
      summary: entrySummary || "",
      author: author?.[0] || "",
      sourceURL: sourceURL || "", // Include the source URL here
    };

    processedData.push(individualEntry);
  });

  return processedData;
};

export default extractAtomData;
