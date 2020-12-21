const path = require("path");
const mergeImg = require("merge-img");

function getMiniCardFile(card_detail_id) {
  const file_name = `${card_detail_id}.png`;
  const file = path.resolve(process.cwd(), "../sumer/public/img", file_name);
  return file;
}

function assistFile(player) {
  return path.resolve(process.cwd(), "resources/assist", `${player}.jpg`);
}

function writeAssistImage(suggestions, filename) {
  let mergeTeam = [];
  const mOptions = { offset: 3, color: 0x3a3a3aff };
  for (let team of suggestions) {
    let cards = team.map(getMiniCardFile).slice(1);
    let mergeRow = [];
    for (let i = 0, j = cards.length; i < j; i += 3) {
      let row = cards.slice(i, i + 3);
      mergeRow.push(mergeImg(row, mOptions));
    }

    mergeTeam.push(
      Promise.all(mergeRow)
        .then(rows => mergeImg(rows, { ...mOptions, direction: true }))
        .then(monsters =>
          mergeImg([getMiniCardFile(team[0]), monsters], {
            ...mOptions,
            margin: 3,
            align: "center"
          })
        )
    );
  }

  return Promise.all(mergeTeam)
    .then(rows => mergeImg(rows, { ...mOptions, direction: true }))
    .then(img => img.quality(60).write(filename));
}

module.exports = {
  writeAssistImage,
  assistFile
};
