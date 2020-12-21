const fs = require("fs");

const WALLET_FILE = "resources/belfyna.wallet";

function loadWallet() {
  let lines = fs.readFileSync(WALLET_FILE, "utf8").split("\n");
  let rs = new Map();
  for (let i in lines) {
    let parts = lines[i].split("|");
    if (parts.length != 2) continue;
    const chatId = parseInt(parts[0].trim());
    const balance = parseInt(parts[1].trim());
    rs.set(chatId, balance);
  }
  return rs;
}

function storeWallet(wallet) {
  let data = "";
  wallet.forEach((v, k) => (data += `${k.toString().padEnd(20)} | ${v}\n`));
  fs.writeFileSync(WALLET_FILE, data);
}

class BelfynaWallet {
  constructor() {
    this.load();
  }

  load() {
    this.wallet = loadWallet();
  }

  store() {
    storeWallet(this.wallet);
  }

  add(chatId, value) {
    this.load();
    chatId = parseInt(chatId);
    if (this.wallet.has(chatId))
      this.wallet.set(chatId, this.wallet.get(chatId) + value);
    else this.wallet.set(chatId, 20 + value);
    this.store();
    return this.wallet.get(chatId);
  }

  sub(chatId, value) {
    this.load();
    chatId = parseInt(chatId);
    let current = this.wallet.get(chatId);
    if (!current || current < value) return false;
    this.wallet.set(chatId, current - value);
    this.store();
    return true;
  }

  get(chatId) {
    chatId = parseInt(chatId);
    if (this.wallet.has(chatId)) return this.wallet.get(chatId);
    this.load();
    this.wallet.set(chatId, 20);
    this.store();
    return 20;
  }
}

module.exports = BelfynaWallet;
