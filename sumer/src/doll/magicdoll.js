const hive = require("@hiveio/hive-js");
const Battle = require("./battle");
const teamup = require("../../../belfyna/src/teamup");
const cardUtils = require("../../../kyle/src/card");
const cardDetails = require("../../../kyle/data/cards.json");
const storage = require("../storage");

class MagicDoll {
  constructor(username, postingkey) {
    this.username = username;
    this.postingkey = postingkey;
    this.doBattle();
  }

  stop() {
    this.stopped = true;
  }

  async sendPayment(to) {
    let value = await storage.clearBalance(to, this.username);
    if (value >= 1) {
      let qty = Math.floor(value);
      hive.broadcast.customJson(
        this.postingkey,
        [],
        [this.username],
        "sm_token_transfer",
        JSON.stringify({
          to,
          qty,
          token: "DEC",
          type: "withdraw",
          app: "steemmonsters/0.7.73"
        }),
        (err, result) => {
          if (err) throw err;
        }
      );
      return value;
    }
    return 0;
  }

  async splitIncome(dec) {
    dec = (dec * 90) / 100;
    console.log(`${this.username} split ${dec}`);
    let poolCurrent = {};
    let poolValue = 0;
    let delegators = {};

    const poolCollection = await cardUtils.GetCollection(this.username);
    poolCollection.cards.forEach(c => {
      const id = c.card_detail_id;
      if (!poolCurrent[id] || poolCurrent[id].xp < c.xp) poolCurrent[id] = c;
    });

    for (let detail of cardDetails) {
      const current = poolCurrent[detail.id];
      if (!current) continue;
      const values = cardUtils.GetBurnValues(detail.rarity);
      const level = cardUtils.GetCardLevelInfo(current).level;
      const value = values[level - 1];
      poolValue += value;
      let delegatorValue = delegators[current.player] || 0;
      delegators[current.player] = delegatorValue + value;
    }

    for (let delegator in delegators) {
      let portion = (dec * delegators[delegator]) / poolValue;
      console.log(`${this.username} add ${portion} to ${delegator}`);
      storage.incBalance(delegator, this.username, portion);
    }
  }

  async doBattle() {
    if (this.stopped) return;
    let statusName;

    const battle = new Battle(this.username, this.postingkey, async status => {
      if (statusName == status.statusName) return;
      statusName = status.statusName;

      console.log(`${this.username} doBattle:`, statusName);
      if (statusName == "error" || statusName == "noEnemyFound") battle.end();
      if (statusName == "enemyFound") {
        battle.end();
        let match = status.data;
        const match_settings = JSON.parse(match.settings);
        match.rating_level = match_settings.rating_level;

        const fullcollection = await cardUtils.UserCollection(match.player);
        const collection = cardUtils.FilterCollection(fullcollection, match);

        const team = await teamup(collection, match);
        if (team && team.uid) {
          battle.submitTeam(team.uid[0], team.uid.slice(1));
        } else {
          battle.surrender();
        }
      }
    });

    setTimeout(async () => {
      battle.end();
      let rs = await battle.getResult();
      console.log(`${this.username}`, "result", rs.winner);
      if (rs.winner == this.username) {
        this.splitIncome(JSON.parse(rs.dec_info).reward);
      }
    }, 300000);

    setTimeout(() => {
      this.doBattle();
    }, 600000);
  }
}

module.exports = MagicDoll;
