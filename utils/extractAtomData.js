const extractAtomData = (rawAtomData) => {
  let processedData = [];
  const atomData = rawAtomData.feed.entry;

  atomData.forEach((data) => {
    const { title, link, id, published, updated, summary, author } = data;

    let individualEntry = {
      title: title[0],
      link: link[0].$.href,
      id: id[0],
      published: published[0],
      updated: updated[0],
      summary: summary[0],
      author: author[0],
    };

    processedData.push(individualEntry);
  });

  return processedData;
};

export default extractAtomData;
