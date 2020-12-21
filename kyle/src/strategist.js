const combinationManaSum = require("./combination");
const scoreTeam = require("./score");
const sortTeam = require("./formation");
const {
  validTeam,
  validMonsters,
  validSummoners,
  mapStats,
  shuffle
} = require("./utils");

module.exports = function(collection, match) {
  match.opponent = { melee: 2, ranged: 2, magic: 2, armor: 2, total: 6 };

  let maxScore = 0;
  let maxSummoner = null;
  let maxTeam = null;
  let count = 0;

  let minMana = 0;
  if (!match.ruleset.includes("Little League")) {
    if (match.mana_cap >= 30) minMana = 3;
    if (match.mana_cap >= 40) minMana = 4;
  } else {
    if (match.mana_cap >= 26) match.mana_cap = 25;
  }

  let summoners = shuffle(collection.filter(c => validSummoners(c, match)));
  summoners
    .map(summoner => [
      summoner,
      shuffle(
        collection
          .filter(c => c.abilities.includes("Tank Heal") || c.mana >= minMana)
          .filter(c => validMonsters(c, match, summoner.color))
          .map(mapStats(match.rating_level, summoner))
      )
    ])
    .map(([summoner, candidates]) => [summoner, sortTeam(candidates)])
    .forEach(([summoner, candidates]) => {
      combinationManaSum(candidates, match.mana_cap - summoner.mana, team => {
        if (!validTeam(summoner, team, match)) return true;
        if (count++ > 2000000) return false;
        let score = scoreTeam(summoner, team, match);
        if (match.mana_cap == 99 && summoner.mana == 7) score += 200;
        if (match.prefer_color && match.prefer_color == summoner.color)
          score += match.prefer_bonus
            ? match.prefer_bonus
            : 2 * match.mana_cap * match.rating_level;
        if (score <= maxScore) return true;
        maxScore = score;
        maxSummoner = summoner;
        maxTeam = team;
        return true;
      });
    });

  if (!maxSummoner || !maxTeam) return {};
  return {
    score: maxScore,
    cid: [maxSummoner.card_detail_id, ...maxTeam.map(c => c.card_detail_id)],
    uid: [maxSummoner.uid, ...maxTeam.map(c => c.uid)]
  };
};
