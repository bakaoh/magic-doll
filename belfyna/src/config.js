const fs = require("fs");
const utils = require("./utils");
const BELFYNA_FILE = "resources/belfyna";

function loadPlayers() {
  let lines = fs.readFileSync(BELFYNA_FILE, "utf8").split("\n");
  let rs = new Map();
  for (let i in lines) {
    let parts = lines[i].split("|");
    if (parts.length != 4) continue;
    const name = parts[0].trim();
    const chatId = parts[1].trim();
    const joinDate = parts[2].trim();
    const status = parseInt(parts[3].trim());
    rs.set(name, { name, chatId, joinDate, status });
  }
  return rs;
}

function storePlayers(players) {
  let data = "";
  players.forEach(
    (v, k) =>
      (data += `${k.padEnd(20)} | ${v.chatId
        .toString()
        .padEnd(20)} | ${v.joinDate.padEnd(
        20
      )} | ${v.status.toString().padStart(3)}\n`)
  );
  fs.writeFileSync(BELFYNA_FILE, data);
}

function getPlayerDetails(name) {
  return utils.getApi("/players/details", { name });
}

class BelfynaConfig {
  constructor() {
    this.load();
  }

  load() {
    this.players = loadPlayers();
  }

  store() {
    storePlayers(this.players);
  }

  getChatIds(player) {
    if (this.players.has(player)) {
      let chatId = this.players.get(player).chatId;
      if (chatId != 533383478) return [chatId, 533383478];
    }
    return [533383478];
  }

  getActive() {
    let active = [];
    this.players.forEach((v, k) => {
      if (v.status == 1) active.push(k);
    });
    return active;
  }

  getJoinDate(player) {
    if (this.players.has(player)) return this.players.get(player).joinDate;
    return new Date().toISOString();
  }

  getStatus(chatId) {
    let html = "<pre>Name             | Status\n";
    let players = this.players;
    let count = 0;
    players.forEach((v, k) => {
      if (v.chatId != chatId) return;
      const lName = v.name.padEnd(16);
      const lStatus = v.status == 1 ? "active" : "idle";
      html += `${lName} | ${lStatus.padStart(6)}\n`;
      count++;
    });
    if (!count)
      return "You're not controlling any player at the moment. Please add them using <i>/add</i> command. /help";
    html += `\n</pre>`;
    return html;
  }

  async addPlayer(chatId, name) {
    name = name.toLowerCase();
    this.load();
    if (this.players.has(name)) {
      if (this.players.get(name).chatId == chatId)
        return `You have already added <b>${name}</b>, please use <i>/setActive ${name}</i> command to receive suggestions`;
      return `Another added <b>${name}</b>, please contact @bakaoh if you are account owner`;
    }
    let details = await getPlayerDetails(name);
    if (details.error) return details.error;
    this.players.set(name, {
      name,
      chatId,
      joinDate: details.join_date,
      status: 1
    });
    this.store();
    return `I will assist <b>${name}</b> in battles!`;
  }

  async removePlayer(chatId, name) {
    name = name.toLowerCase();
    this.load();
    if (!this.players.has(name)) return `I can't find <b>${name}</b>`;
    let player = this.players.get(name);
    if (player.chatId != chatId)
      return `I can't do that, <b>${name}</b> is not in your control`;
    this.players.delete(name);
    this.store();
    return `I will stop assisting <b>${name}</b>, let me know if you need any help!`;
  }

  async setStatus(chatId, name, status) {
    name = name.toLowerCase();
    this.load();
    if (!this.players.has(name)) return `I can't find <b>${name}</b>`;
    let player = this.players.get(name);
    if (player.chatId != chatId)
      return `I can't do that, <b>${name}</b> is not in your control`;
    player.status = status;
    this.store();
    if (status == 1) {
      return `I will send suggestions for <b>${name}</b> when he in a battle!`;
    } else {
      return `I will stop sending suggestions for <b>${name}</b>, let me know if you need help!`;
    }
  }
}

module.exports = BelfynaConfig;
