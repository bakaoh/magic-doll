const fs = require("fs");
const teamup = require("./src/strategist");

const inputFile = process.argv[2];
const outputFile = process.argv[3];

const input = JSON.parse(fs.readFileSync(inputFile));
const output = teamup(input.collection, input.match);

fs.writeFileSync(outputFile, JSON.stringify(output));
