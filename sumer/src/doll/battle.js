const hive = require("@hiveio/hive-js");
const md5 = require("md5");
const utils = require("../utils");

class Battle {
  constructor(username, postingkey, callback) {
    this.username = username;
    this.postingkey = postingkey;
    this.callback = callback;
    this.status = {};
    this.submittedTeam = false;
    this.ended = false;

    this._broadcast(
      "sm_find_match",
      { match_type: "Ranked" },
      (err, result) => {
        if (err) throw err;
        console.log(this.username, "sm_find_match", result.id);
        this.findMatchId = result.id;
      }
    );

    this._checkInterval = setInterval(() => {
      this._checkBattleStatus();
    }, 5000);
  }

  end() {
    this.ended = true;
    clearInterval(this._checkInterval);
  }

  surrender() {
    this._broadcast(
      "sm_surrender",
      { battle_queue_id: this.findMatchId },
      (err, result) => {
        console.log(this.username, "sm_surrender", result.id);
      }
    );
  }

  submitTeam(summoner, monsters) {
    if (this.submittedTeam) return;
    const secret = Battle.generatePassword();
    const team_hash = md5(summoner + "," + monsters.join() + "," + secret);
    this.submittedTeam = true;
    this._broadcast(
      "sm_submit_team",
      {
        trx_id: this.findMatchId,
        team_hash,
        summoner,
        monsters,
        secret
      },
      (err, result) => {
        if (err) throw err;
        console.log(this.username, "sm_submit_team", result.id);
      }
    );
  }

  getResult() {
    return utils.getApi("/battle/result", { id: this.findMatchId });
  }

  _broadcast(id, data, callback) {
    data.app = "steemmonsters/0.7.73";
    hive.broadcast.customJson(
      this.postingkey,
      [],
      [this.username],
      id,
      JSON.stringify(data),
      callback
    );
  }

  async _checkBattleStatus() {
    if (!this.findMatchId || this.ended) return;
    const battleData = await utils.getApi("/battle/status", {
      id: this.findMatchId
    });
    this.status.data = battleData;
    if (typeof battleData === "string") {
      this.status.statusName = "battleTxProcessing";
    } else if (battleData.error) {
      this.status.statusName = "error";
    } else if (battleData.status === 0) {
      this.status.statusName = "searchingForEnemy";
    } else if (battleData.status === 1) {
      this.status.statusName = "enemyFound";
    } else if (battleData.status === 3) {
      this.status.statusName = "noEnemyFound";
    }
    this.callback(this.status);
  }

  static generatePassword(length = 10) {
    var charset =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
      retVal = "";
    for (var i = 0, n = charset.length; i < length; ++i) {
      retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
  }
}

module.exports = Battle;
