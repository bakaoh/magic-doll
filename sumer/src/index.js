const express = require("express");
const cookieParser = require("cookie-parser");
const utils = require("./utils");
const storage = require("./storage");
const cardDetails = require("../../kyle/data/cards.json");
const cardUtils = require("../../kyle/src/card");
const MagicDoll = require("./doll/magicdoll");

const app = express();
app.use(cookieParser());
app.use(express.static("public"));
app.engine("html", require("ejs").renderFile);

let mapPools = {};
storage.listPool().then(list => {
  for (let pool of list) {
    var doll = new MagicDoll(pool.name, pool.posting);
    mapPools[pool.name] = { doll, creator: pool.creator };
  }
});

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
  let totalUnclaimedReward = 0;
  const balances = loggedIn ? await storage.listBalance(userName) : {};
  for (let poolName in mapPools) {
    let userUnclaimedReward = balances[poolName] || 0;
    let pool = {
      poolName,
      creator: mapPools[poolName].creator,
      poolValue: 0,
      poolCard: 0,
      userValueInPool: 0,
      userCardInPool: 0,
      userUnclaimedReward
    };
    totalUnclaimedReward += userUnclaimedReward;
    poolMap[poolName] = pool;
    if (pool.creator == "official") pools.push(pool);
    else cpools.push(pool);
  }

  let user = {
    userName,
    totalCard: 0,
    totalValue: 0,
    delegatedCard: 0,
    delegatedValue: 0,
    totalUnclaimedReward
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
  const poolName = req.params.pool;
  if (!mapPools[poolName]) {
    res.render(__dirname + "/views/404.html", {});
    return;
  }

  let userName = req.cookies["hive-username"];
  let loggedIn = typeof userName != "undefined" && userName != "";
  let poolCurrent = {};
  let userDelegated = {};
  let userDelegatable = {};

  const poolCollection = await cardUtils.GetCollection(poolName);
  poolCollection.cards.forEach(c => {
    const id = c.card_detail_id;
    if (!poolCurrent[id] || poolCurrent[id].xp < c.xp) poolCurrent[id] = c;
    if (c.player == userName) {
      let card = { uid: c.uid, level: c.level };
      if (userDelegated[id]) userDelegated[id].push(card);
      else userDelegated[id] = [card];
    }
  });

  let user = {
    userName,
    totalCard: 0,
    totalValue: 0,
    delegatedCard: 0,
    delegatedValue: 0,
    totalUnclaimedReward: 0
  };
  if (loggedIn) {
    const userCollection = await cardUtils.GetCollection(userName);
    userCollection.cards.forEach(c => {
      if (c.player == userName) {
        user.totalCard++;
        let value = cardUtils.CalculateDEC(c);
        user.totalValue += value;
        if (mapPools[c.delegated_to]) {
          user.delegatedCard++;
          user.delegatedValue += value;
        }
      }
      const id = c.card_detail_id;
      if (c.player != userName || c.delegated_to) return;
      if (!poolCurrent[id] || poolCurrent[id].xp < c.xp) {
        let card = { uid: c.uid, level: c.level };
        if (userDelegatable[id]) userDelegatable[id].push(card);
        else userDelegatable[id] = [card];
      }
    });
    const balances = await storage.listBalance(userName);
    for (let poolName in balances) {
      user.totalUnclaimedReward += balances[poolName];
    }
  }

  let pool = {
    poolName,
    poolValue: 0,
    poolCard: 0,
    creator: mapPools[poolName].creator,
    userValueInPool: 0,
    userCardInPool: 0,
    userUnclaimedReward: loggedIn
      ? await storage.getBalance(userName, poolName)
      : 0
  };
  let cards = [];
  for (let detail of cardDetails) {
    const current = poolCurrent[detail.id];
    let edition = parseInt(detail.editions[0]);
    const values = cardUtils.GetBurnValues(detail.rarity);
    const level = current ? current.level : 0;
    const value = current ? values[level - 1] : 0;
    const owner = current ? current.player : "none";
    pool.poolValue += value;
    if (current) pool.poolCard++;
    if (owner == userName) {
      pool.userValueInPool += value;
      pool.userCardInPool++;
    }
    if (edition == 0) edition = 1;
    if (userDelegatable[detail.id])
      for (let c of userDelegatable[detail.id]) c.value = values[c.level - 1];
    if (userDelegated[detail.id])
      for (let c of userDelegated[detail.id]) c.value = values[c.level - 1];
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

  res.render(__dirname + "/views/main.html", {
    page: "pool",
    user,
    pool,
    cards,
    loggedIn
  });
});

app.post("/sumer/@:pool/payout", async function(req, res) {
  const poolName = req.params.pool;
  if (!mapPools[poolName]) {
    res.send(JSON.stringify({ success: false, message: "Pool not found" }));
    return;
  }

  let userName = req.cookies["hive-username"];
  let loggedIn = typeof userName != "undefined" && userName != "";
  if (!loggedIn) {
    res.send(JSON.stringify({ success: false, message: "Login required" }));
    return;
  }
  let value = await mapPools[poolName].doll.sendPayment(userName);
  if (value > 0) {
    res.send(JSON.stringify({ success: true, message: "Send success" }));
  } else {
    res.send(JSON.stringify({ success: false, message: "Invalid balance" }));
  }
});

app.listen(1786);
