const path = require("path");
const fs = require("fs");
const { Engine, Task, utils, vm } = require("yajsapi");
const { asyncWith, logUtils, range } = utils;

utils.changeLogLevel("debug");

const SUBNET_TAG = "community.3";

async function teamup(collection, match) {
  const _package = await vm.repo(
    "22c45201c7b40d8719bd8da3fae74cf9839bf3ea0770ce5fda846eaf",
    1,
    1.0
  );

  async function* worker(ctx, tasks) {
    const input_file = `/kyle/request/${match.id}.in.json`;
    ctx.send_json(input_file, { collection, match });
    for await (let task of tasks) {
      const round = task.data();
      const output_filename = `${match.id}-${round}.out.json`;
      const output_file = `/kyle/request/${output_filename}`;
      ctx.run("/usr/local/bin/node", [
        "/kyle/app/index.js",
        input_file,
        output_file
      ]);
      const download_file = path.resolve(
        process.cwd(),
        "resources/assist",
        output_filename
      );
      ctx.download_file(output_file, download_file);
      yield ctx.commit();
      let rs = fs.readFileSync(download_file);
      task.accept_task(rs);
    }
    ctx.log(`${match.id} done`);
    return;
  }

  let maxRs = { score: 0 };
  const rounds = range(0, 3, 1);
  await asyncWith(
    await new Engine(
      _package,
      3,
      900000, // 5 min
      "10.0",
      undefined,
      SUBNET_TAG,
      logUtils.logSummary()
    ),
    async engine => {
      for await (let task of engine.map(
        worker,
        rounds.map(round => new Task(round))
      )) {
        let rs = JSON.parse(task.output().toString());
        if (rs.score && maxRs.score < rs.score) {
          maxRs = rs;
        }
      }
    }
  );
  return maxRs;
}

module.exports = teamup;
