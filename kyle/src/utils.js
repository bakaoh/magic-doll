const {
  CanPlayCard,
  GetCardStats,
  GetMaxXp,
  GetMaxSummonerXp,
  IsAllow
} = require("./card");

function validTeam(summoner, monsters, match) {
  if (!summoner || !validSummoners(summoner, match)) return false;
  if (!monsters || !monsters.length || monsters.length > 6) return false;
  let mana = summoner.mana;
  let monstersId = [];
  let color = summoner.color != "Gold" ? summoner.color : null;
  for (let i = 0; i < monsters.length; i++) {
    if (monsters[i].color != "Gray" && monsters[i].color != "Gold") {
      if (!color) color = monsters[i].color;
      else if (monsters[i].color != color) return false;
    }
    if (monstersId.includes(monsters[i].card_detail_id)) return false;
    if (!validMonsters(monsters[i], match, summoner.color)) return false;
    monstersId.push(monsters[i].card_detail_id);
    mana += monsters[i].mana;
  }
  if (mana > match.mana_cap) return false;
  return true;
}

function validSummoners(c, match) {
  if (c.type !== "Summoner") return false;
  if (!IsAllow(c, match.allowed_cards)) return false;
  if (match.inactive.indexOf(c.color) >= 0) return false;
  if (match.ruleset.includes("Little League") && c.mana > 4) return false;
  if (match.match_type == "Ranked" && !CanPlayCard(c, match.player))
    return false;
  return true;
}

function validMonsters(c, match, color) {
  if (c.type !== "Monster") return false;
  if (!IsAllow(c, match.allowed_cards)) return false;
  if (match.inactive.indexOf(c.color) >= 0) return false;
  if (c.color != color && c.color != "Gray" && color != "Gold") return false;
  if (match.ruleset.includes("Lost Legendaries") && c.rarity == 4) return false;
  if (match.ruleset.includes("Rise of the Commons") && c.rarity > 2)
    return false;
  if (match.ruleset.includes("Taking Sides") && c.color == "Gray") return false;
  if (match.ruleset.includes("Little League") && c.mana > 4) return false;
  if (match.ruleset.includes("Even Stevens") && c.mana % 2 == 1) return false;
  if (match.ruleset.includes("Odd Ones Out") && c.mana % 2 == 0) return false;
  if (match.match_type == "Ranked" && !CanPlayCard(c, match.player))
    return false;
  if (match.ruleset.includes("Up Close & Personal") && c.attack == 0)
    return false;
  if (match.ruleset.includes("Keep Your Distance") && c.attack > 0)
    return false;
  if (match.ruleset.includes("Broken Arrows") && c.ranged > 0) return false;
  if (match.ruleset.includes("Lost Magic") && c.magic > 0) return false;
  return true;
}

function shuffle(array, rng) {
  if (!rng) rng = Math.random;
  return array.sort(() => rng() - 0.5);
}

function mapStats(rating_level, summoner) {
  let summoner_xp = GetMaxSummonerXp(rating_level, summoner);
  return card =>
    Object.assign(
      {},
      card,
      GetCardStats({
        card_detail_id: card.card_detail_id,
        xp: GetMaxXp(summoner, summoner_xp, card),
        gold: card.gold
      })
    );
}

function logTeam(strategist, match, summoner, team, score) {
  console.log(
    `[${match.player} vs ${match.opponent_player}] (${new Date().toGMTString()}) ${strategist} (${match.ruleset}|${match.mana_cap})`,
    summoner && team
      ? `${summoner.name} ${JSON.stringify(team.map(c => c.name))}`
      : "",
    score ? `score ${score}` : ""
  );
}

module.exports = {
  validTeam,
  validSummoners,
  validMonsters,
  shuffle,
  mapStats,
  logTeam
};
