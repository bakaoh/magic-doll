const level = require("level");
const db = level("db");

function addPool(name, posting, creator = "official") {
  return new Promise((resolve, reject) => {
    let pool = { name, posting, creator };
    let key = `pool:${pool.name}`;
    db.put(key, JSON.stringify(pool), err => {
      if (err) reject(err);
      else resolve(pool);
    });
  });
}

function listPool() {
  return new Promise((resolve, reject) => {
    let pools = [];
    db.createReadStream({ gt: "pool:" })
      .on("data", data => {
        if (data.key.startsWith("pool:")) pools.push(JSON.parse(data.value));
      })
      .on("error", err => {
        reject(err);
      })
      .on("end", () => {
        resolve(pools);
      });
  });
}

function incBalance(user, pool, value) {
  return new Promise((resolve, reject) => {
    let key = `balance:${user}:${pool}`;
    db.get(key, (err, old_value) => {
      if (err) {
        if (err.name == "NotFoundError") {
          old_value = "0";
        } else return reject(err);
      }
      let new_value = parseFloat(old_value) + value;
      db.put(key, new_value, err => {
        if (err) reject(err);
        else resolve(new_value);
      });
    });
  });
}

function clearBalance(user, pool) {
  return new Promise((resolve, reject) => {
    let key = `balance:${user}:${pool}`;
    db.get(key, (err, old_value) => {
      if (err) {
        if (err.name == "NotFoundError") {
          return resolve(0);
        } else return reject(err);
      }
      db.del(key, err => {
        if (err) reject(err);
        else resolve(parseFloat(old_value));
      });
    });
  });
}

function getBalance(user, pool) {
  return new Promise((resolve, reject) => {
    let key = `balance:${user}:${pool}`;
    db.get(key, (err, value) => {
      if (err) {
        if (err.name == "NotFoundError") {
          return resolve(0);
        } else return reject(err);
      } else resolve(parseFloat(value));
    });
  });
}

function listBalance(user) {
  return new Promise((resolve, reject) => {
    let balances = {};
    let prefix = `balance:${user}:`;
    db.createReadStream({ gt: prefix, lt: `${prefix}zzzzzzzzzzzz` })
      .on("data", data => {
        if (data.key.startsWith(prefix))
          balances[data.key.slice(prefix.length)] = parseFloat(data.value);
      })
      .on("error", err => {
        reject(err);
      })
      .on("end", () => {
        resolve(balances);
      });
  });
}

module.exports = {
  addPool,
  listPool,
  incBalance,
  clearBalance,
  getBalance,
  listBalance
};
