require("bluebird").config({ cancellation: true });
const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const utils = require("./utils");
const BelfynaConfig = require("./config");
const BelfynaWallet = require("./wallet");
const teamup = require("./teamup");
const { writeAssistImage, assistFile } = require("./image");
const { UserCollection, FilterCollection } = require("../../kyle/src/card");

const COST = 1;
const ID_FILE = `resources/belfyna.id`;
const RATING_LEVELS = [0, 100, 1000, 1900, 2800];

const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: true });
const config = new BelfynaConfig();
const wallet = new BelfynaWallet();

const start = `
Hello, my name is Belfyna, i will be your assistant in Splinterlands. Please visit <a href="https://idlesplinter.xyz/">our website</a> for more infomation.

To get started, please send this command:

/add [splinteraccount]

You will get ${COST *
  10} DEC to try out the service. Each match currently cost ${COST} DEC. Please send DEC to <b>belfyna</b> using in-game transfer to deposit more DEC. You can check your balance using /status command

Use /help to get list of commands
`;

const help = `
You can control me by sending these commands:

/add [splinteraccount] - add account to your list
/remove [splinteraccount] - remove account from your list
/setActive [splinteraccount] - start sending suggestions
/setIdle [splinteraccount] - stop sending suggestions
/status - get list of your account and their status

To deposit DEC, please send DEC to <b>belfyna</b> using in-game transfer. Each match currently cost ${COST} DEC.
`;

let lastSent = 0;
const sendOpt = { parse_mode: "Html" };

function botSend(f) {
  if (lastSent < new Date().getTime()) {
    lastSent = new Date().getTime();
  }
  lastSent += 5000;
  setTimeout(f, lastSent - new Date().getTime());
}

bot.onText(/\/start/, (msg, match) => {
  console.log(`${JSON.stringify(msg)}`);
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, start, sendOpt);
});

bot.onText(/\/help/, (msg, match) => {
  console.log(`${JSON.stringify(msg)}`);
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, help, sendOpt);
});

bot.onText(/\/add (.+)/, (msg, match) => {
  console.log(`${JSON.stringify(msg)}`);
  const chatId = msg.chat.id;
  const player = match[1].trim();
  config.addPlayer(chatId, player).then(rs => {
    bot.sendMessage(chatId, rs, sendOpt);
  });
});

bot.onText(/\/remove (.+)/, (msg, match) => {
  console.log(`${JSON.stringify(msg)}`);
  const chatId = msg.chat.id;
  const player = match[1].trim();
  config.removePlayer(chatId, player).then(rs => {
    bot.sendMessage(chatId, rs, sendOpt);
  });
});

bot.onText(/\/setActive (.+)/, (msg, match) => {
  console.log(`${JSON.stringify(msg)}`);
  const chatId = msg.chat.id;
  const player = match[1].trim();
  config.setStatus(chatId, player, 1).then(rs => {
    bot.sendMessage(chatId, rs, sendOpt);
  });
});

bot.onText(/\/setIdle (.+)/, (msg, match) => {
  console.log(`${JSON.stringify(msg)}`);
  const chatId = msg.chat.id;
  const player = match[1].trim();
  config.setStatus(chatId, player, 0).then(rs => {
    bot.sendMessage(chatId, rs, sendOpt);
  });
});

bot.onText(/\/status/, (msg, match) => {
  console.log(`${JSON.stringify(msg)}`);
  const chatId = msg.chat.id;
  const rs = config.getStatus(chatId);
  const balance = wallet.get(chatId);
  bot.sendMessage(chatId, rs + `Balance: ${balance} DEC`, sendOpt);
});

async function assit(match) {
  let chatIds = config.getChatIds(match.player);
  if (!chatIds || chatIds.length == 0) return;
  if (wallet.get(chatIds[0]) < COST) {
    bot.sendMessage(
      chatIds[0],
      "Your balance is not enough, please send DEC to <b>belfyna</b> using in-game transfer to deposit more.",
      sendOpt
    );
    return;
  }

  const match_settings = JSON.parse(match.settings);
  match.rating_level = match_settings.rating_level;
  match.player_rating = RATING_LEVELS[match_settings.rating_level];
  if (match.match_type == "Tournament") {
    match.allowed_cards = match_settings.allowed_cards;
  }

  const join_date = config.getJoinDate(match.player);
  const fullcollection = await UserCollection(match.player, join_date);
  const collection = FilterCollection(fullcollection, match);
  const team = await teamup(collection, match);
  if (team && team.cid) {
    let suggestions = [team.cid];
    sendAssistMessage({
      player: match.player,
      data: { ...match, suggestions }
    });
    if (suggestions) wallet.sub(chatIds[0], COST);
  }
}

async function sendAssistMessage(body) {
  const data = body.data;
  if (body.type == "opponent_team") {
    const filename = assistFile(body.player + "_opponent");
    if (data.opponents) await writeAssistImage([data.opponents], filename);
    botSend(() => {
      const chatIds = config.getChatIds(data.player);
      let caption = `<b>${data.player}</b> vs <b>${data.opponent_player}</b>`;
      if (data.opponents) {
        caption += "\nOpponent submitted team";
        const photo = fs.readFileSync(filename);
        const contentType = "image/jpeg";
        for (let chatId of chatIds)
          bot.sendPhoto(
            chatId,
            photo,
            { caption, parse_mode: "Html" },
            { contentType }
          );
      } else {
        caption += "\nOpponent submitted team and hidden it";
        for (let chatId of chatIds) bot.sendMessage(chatId, caption, sendOpt);
      }
    });
  } else {
    const filename = assistFile(body.player);
    if (data.suggestions) await writeAssistImage(data.suggestions, filename);
    botSend(() => {
      const chatIds = config.getChatIds(data.player);
      let caption = `<b>${data.player}</b> vs <b>${data.opponent_player}</b>\n`;
      caption += `<i>Ruleset:</i> ${data.ruleset}\n`;
      caption += `<i>Manacap:</i> ${data.mana_cap}\n`;
      caption += `<i>Inactive:</i> ${data.inactive}`;

      if (data.suggestions) {
        const photo = fs.readFileSync(filename);
        const contentType = "image/jpeg";
        for (let chatId of chatIds)
          bot.sendPhoto(
            chatId,
            photo,
            { caption, parse_mode: "Html" },
            { contentType }
          );
      } else {
        caption += "\nNo suggestion";
        for (let chatId of chatIds) bot.sendMessage(chatId, caption, sendOpt);
      }
    });
  }
}

const opponentIds = {};

const findCard = ids => utils.getApi("/cards/find", { ids });

const getIds = async uids => {
  try {
    const details = await findCard(uids.join());
    return details.map(c => {
      if (c.card_detail_id) return c.card_detail_id;
      let p = c.uid.split("-");
      if (p.length == 3) return parseInt(p[1]);
      return 0;
    });
  } catch (err) {
    console.error(err);
    return null;
  }
};

async function waitForMatch(id, player) {
  let chatIds = config.getChatIds(player);
  if (!chatIds || chatIds.length == 0) return;
  if (wallet.get(chatIds[0]) < COST) {
    bot.sendMessage(
      chatIds[0],
      "Your balance is not enough, please send DEC to <b>belfyna</b> using in-game transfer to deposit more.",
      sendOpt
    );
    return;
  }

  for (let i = 0; i < 30; i++) {
    try {
      let match = await utils.getApi("/players/outstanding_match", {
        username: player
      });
      if (!match) return;
      if (match.opponent) {
        opponentIds[match.opponent] = player;
        assit(match).catch(console.error);
        return;
      }
    } catch (err) {
      console.error(err);
    }
    await utils.sleep(15000);
  }
}

const opts = { flags: "a" };
const processedFile = fs.createWriteStream(ID_FILE, opts);
const processedIds = fs.readFileSync(ID_FILE, "utf8").split("\n");

async function runFindMatch(trxs, actives) {
  try {
    if (actives.length == 0) return;
    for (let trx of trxs) {
      if (trx.type != "find_match") continue;
      if (processedIds.includes(trx.id)) continue;
      if (!actives.includes(trx.player)) continue;
      console.log("find_match", trx.id, trx.player);
      processedFile.write(trx.id + "\n");
      processedIds.push(trx.id);
      waitForMatch(trx.id, trx.player);
    }
  } catch (err) {
    console.error(err);
  }
}

async function runStartMatch(trxs, actives) {
  try {
    if (actives.length == 0) return;
    for (let trx of trxs) {
      if (trx.type != "start_match") continue;
      if (processedIds.includes(trx.id)) continue;
      if (!actives.includes(trx.player)) continue;
      console.log("start_match", trx.id, trx.player);
      processedFile.write(trx.id + "\n");
      processedIds.push(trx.id);
      assit(JSON.parse(trx.result)).catch(console.error);
    }
  } catch (err) {
    console.error(err);
  }
}

async function runTokenTransfer(trxs) {
  try {
    for (let trx of trxs) {
      if (trx.type != "token_transfer") continue;
      if (processedIds.includes(trx.id)) continue;
      if (!trx.result) continue;
      let result = JSON.parse(trx.result);
      if (!result.success || result.token != "DEC" || result.to != "belfyna")
        continue;
      console.log("token_transfer", trx.id, trx.player, result.amount);
      processedFile.write(trx.id + "\n");
      processedIds.push(trx.id);
      let chatIds = config.getChatIds(trx.player);
      for (let chatId of chatIds) {
        let value = wallet.add(chatId, result.amount);
        bot.sendMessage(
          chatId,
          `Thanks a lot, I received <b>${result.amount} DEC</b> from <b>${trx.player}</b>. Your got ${value} DEC now.`,
          sendOpt
        );
      }
    }
  } catch (err) {
    console.error(err);
  }
}

async function runSubmitTeam(trxs) {
  try {
    for (let trx of trxs) {
      if (trx.type != "sm_submit_team") continue;
      if (processedIds.includes(trx.id)) continue;
      let data = JSON.parse(trx.data);
      let player = opponentIds[data.trx_id];
      if (!player) continue;
      console.log("submit_team", trx.id, trx.player, "vs", player);
      processedFile.write(trx.id + "\n");
      processedIds.push(trx.id);
      let opponents = null;
      if (data.summoner && data.monsters) {
        opponents = await getIds([data.summoner, ...data.monsters]);
      }

      sendAssistMessage({
        data: { opponent_player: trx.player, player, opponents },
        type: "opponent_team",
        player
      });
    }
  } catch (err) {
    console.error(err);
  }
}

async function runAll() {
  console.log("RunAll");
  try {
    let trxs = await utils.getApiIo("/transactions/history", {
      limit: 200,
      types: "token_transfer,find_match,start_match,sm_submit_team"
    });
    let actives = config.getActive();
    runFindMatch(trxs, actives);
    runStartMatch(trxs, actives);
    runTokenTransfer(trxs);
    runSubmitTeam(trxs);
  } catch (err) {
    console.error(err);
  }
  setTimeout(runAll, 5000);
}

runAll();
