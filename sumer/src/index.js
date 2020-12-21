const express = require("express");
const cookieParser = require("cookie-parser");
const utils = require("./utils");
const cardDetails = require("../../kyle/data/cards.json");
const cardUtils = require("../../kyle/src/card");

const app = express();
app.use(cookieParser());
app.use(express.static("public"));
app.engine("html", require("ejs").renderFile);

let listPools = {
  "md-melee": { creator: "official", policy: "95-5", strategy: "kyle" },
  "md-support": { creator: "official", policy: "95-5", strategy: "kyle" },
  "md-fencer": { creator: "official", policy: "95-5", strategy: "kyle" },
  "md-heavyshield": { creator: "official", policy: "95-5", strategy: "kyle" },
  "md-grappler": { creator: "official", policy: "95-5", strategy: "kyle" },
  "md-defective": { creator: "official", policy: "95-5", strategy: "kyle" },
  "md-sniper": { creator: "official", policy: "95-5", strategy: "kyle" },
  "md-healer": { creator: "official", policy: "95-5", strategy: "kyle" },
  "md-cannon": { creator: "official", policy: "95-5", strategy: "kyle" },
  vordore: { creator: "granverion", policy: "90-5-5", strategy: "kyle" },
  snaf: { creator: "granverion", policy: "90-5-5", strategy: "kyle" },
  ladol: { creator: "granverion", policy: "90-5-5", strategy: "kyle" }
};

app.post("/sumer/login/:username", function(req, res) {
  res.cookie("hive-username", req.params.username);
  res.send(JSON.stringify({ success: true, message: "Login sucess" }));
});

app.get("/sumer", async function(req, res) {
  let userName = req.cookies["hive-username"];
  let loggedIn = typeof userName != "undefined" && userName != "";

  let pools = [];
  let cpools = [];
  let poolMap = {};
  for (let poolName in listPools) {
    let pool = {
      poolName,
      creator: listPools[poolName].creator,
      policy: listPools[poolName].policy,
      poolValue: 0,
      poolCard: 0,
      userValueInPool: 0,
      userCardInPool: 0
    };
    poolMap[poolName] = pool;
    if (pool.creator == "official") pools.push(pool);
    else cpools.push(pool);
  }

  let user = {
    userName,
    totalCard: 0,
    totalValue: 0,
    delegatedCard: 0,
    delegatedValue: 0
  };
  if (loggedIn) {
    const userCollection = await cardUtils.GetCollection(userName);
    userCollection.cards.forEach(c => {
      if (c.player == userName) {
        user.totalCard++;
        let value = cardUtils.CalculateDEC(c);
        user.totalValue += value;
        if (poolMap[c.delegated_to]) {
          user.delegatedCard++;
          user.delegatedValue += value;
          poolMap[c.delegated_to].userCardInPool++;
          poolMap[c.delegated_to].userValueInPool += value;
        }
      }
    });
  }
  res.render(__dirname + "/views/main.html", {
    page: "home",
    user,
    pools,
    cpools,
    loggedIn
  });
});

app.get("/sumer/@:pool", async function(req, res) {
  if (!listPools[req.params.pool]) {
    res.render(__dirname + "/views/404.html", {});
    return;
  }

  let userName = req.cookies["hive-username"];
  let loggedIn = typeof userName != "undefined" && userName != "";
  let poolCurrent = {};
  let userDelegated = {};
  let userDelegatable = {};

  const poolCollection = await cardUtils.GetCollection(req.params.pool);
  poolCollection.cards.forEach(c => {
    const id = c.card_detail_id;
    if (!poolCurrent[id] || poolCurrent[id].xp < c.xp) poolCurrent[id] = c;
    if (c.player == userName)
      if (userDelegated[id]) userDelegated[id].push(c.uid);
      else userDelegated[id] = [c.uid];
  });

  let user = {
    userName,
    totalCard: 0,
    totalValue: 0,
    delegatedCard: 0,
    delegatedValue: 0
  };
  if (loggedIn) {
    const userCollection = await cardUtils.GetCollection(userName);
    userCollection.cards.forEach(c => {
      if (c.player == userName) {
        user.totalCard++;
        let value = cardUtils.CalculateDEC(c);
        user.totalValue += value;
        if (listPools[c.delegated_to]) {
          user.delegatedCard++;
          user.delegatedValue += value;
        }
      }
      const id = c.card_detail_id;
      if (c.player != userName || c.delegated_to) return;
      if (!poolCurrent[id] || poolCurrent[id].xp < c.xp)
        if (userDelegatable[id]) userDelegatable[id].push(c.uid);
        else userDelegatable[id] = [c.uid];
    });
  }

  let pool = {
    poolName: req.params.pool,
    poolValue: 0,
    poolCard: 0,
    userValueInPool: 0,
    userCardInPool: 0
  };
  let cards = [];
  for (let detail of cardDetails) {
    const current = poolCurrent[detail.id];
    let edition = parseInt(detail.editions[0]);
    const values = cardUtils.GetBurnValues(detail.rarity);
    const level = current ? cardUtils.GetCardLevelInfo(current).level : 0;
    const value = current ? values[level - 1] : 0;
    const owner = current ? current.player : "none";
    pool.poolValue += value;
    if (current) pool.poolCard++;
    if (owner == userName) {
      pool.userValueInPool += value;
      pool.userCardInPool++;
    }
    if (edition == 0) edition = 1;
    cards.push({
      id: detail.id,
      name: detail.name,
      rarity: detail.rarity,
      edition,
      img: utils.getCardImage(detail.name, edition),
      level,
      maxlevel: [10, 10, 8, 6, 4][detail.rarity],
      uid: current ? current.uid : "none",
      owner,
      value,
      delegated: userDelegated[detail.id],
      delegatable: userDelegatable[detail.id],
      values
    });
  }

  Object.assign(pool, listPools[pool.poolName]);
  res.render(__dirname + "/views/main.html", {
    page: "pool",
    user,
    pool,
    cards,
    loggedIn
  });
});

app.listen(1786);
