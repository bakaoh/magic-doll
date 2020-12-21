const https = require("https");
const cards = require("../data/cards.json");
const settings = require("../data/settings.json");

let cardMap = {};
for (let card of cards) {
  cardMap[card.id] = card;
}

const generateRandom = (length, rng) => {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  if (!rng) rng = Math.random;
  retVal = "";
  for (var i = 0, n = charset.length; i < length; ++i) {
    retVal += charset.charAt(Math.floor(rng() * n));
  }
  return retVal;
};

const getCurrentBlockNum = () =>
  Math.max(Math.floor((Date.now() - settings.timestamp) / 3e3), 0) +
  settings.last_block;

const GetCollection = account => {
  return new Promise((resolve, reject) => {
    https
      .get(
        `https://game-api.splinterlands.com/cards/collection/${account}`,
        resp => {
          let data = "";
          resp.on("data", chunk => {
            data += chunk;
          });
          resp.on("end", () => {
            resolve(JSON.parse(data));
          });
        }
      )
      .on("error", err => {
        reject(err);
      });
  });
};

const getStarterCard = card_details => {
  let starter_edition = 4;
  if (
    !card_details.editions.split(",").includes(`${starter_edition}`) ||
    card_details.rarity > 2
  )
    return null;
  return {
    uid: `starter-${card_details.id}-${generateRandom(5)}`,
    card_detail_id: card_details.id,
    gold: false,
    xp: starter_edition == 4 ? 1 : 0,
    edition: starter_edition
  };
};

const GetCardLevelInfo = card => {
  var details = cardMap[card.card_detail_id];
  if (isNaN(card.xp)) card.xp = card.edition == 4 || details.tier == 4 ? 1 : 0;
  if (card.edition == 4 || details.tier == 4) {
    let rates = card.gold
      ? settings.combine_rates_gold[details.rarity - 1]
      : settings.combine_rates[details.rarity - 1];
    let level = 0;
    for (let i = 0; i < rates.length; i++) {
      if (rates[i] > card.xp) break;
      level++;
    }
    if (card.xp == 0) level = 1;
    return {
      level: level,
      xp_to_next_level: card.xp - rates[level - 1],
      cards_to_next_level: card.xp - rates[level - 1],
      xp_needed: level >= rates.length ? -1 : rates[level] - rates[level - 1],
      cards_needed: level >= rates.length ? -1 : rates[level] - rates[level - 1]
    };
  }
  var levels = settings.xp_levels[details.rarity - 1];
  var level = 0;
  for (var i = 0; i < levels.length; i++) {
    if (card.xp < levels[i]) {
      level = i + 1;
      break;
    }
  }
  if (level == 0) level = levels.length + 1;
  var xp_to_next_level =
    level > levels.length
      ? card.xp - levels[levels.length - 1]
      : card.xp - (level == 1 ? 0 : levels[level - 2]);
  var xp_needed =
    level > levels.length
      ? -1
      : level == 1
      ? levels[level - 1]
      : levels[level - 1] - levels[level - 2];
  var xp_array =
    card.edition == 1 ||
    card.edition == 3 ||
    (card.edition == 2 && details.id > 100)
      ? card.gold
        ? "beta_gold_xp"
        : "beta_xp"
      : card.gold
      ? "gold_xp"
      : "alpha_xp";
  var xp_per_card = settings[xp_array][details.rarity - 1];
  var cards_needed = Math.ceil(xp_needed / xp_per_card);
  var cards_to_next_level =
    cards_needed - Math.ceil((xp_needed - xp_to_next_level) / xp_per_card);
  return {
    level: level,
    xp_to_next_level: xp_to_next_level,
    cards_to_next_level: cards_to_next_level,
    xp_needed: xp_needed,
    cards_needed: cards_needed
  };
};

function UserCollection(name) {
  return GetCollection(name).then(function(response) {
    var collection = cards.map(c => Object.assign({}, c));
    collection.forEach(c => (c.owned = []));
    for (var i = 0; i < response.cards.length; i++) {
      var card = response.cards[i];
      if (card.delegated_to && card.delegated_to != name) continue;
      var collection_card = collection.find(c => c.id == card.card_detail_id);
      if (collection_card)
        collection_card.owned.push(Object.assign(card, GetCardLevelInfo(card)));
    }
    collection.forEach(c => {
      var starter_card = getStarterCard(c);
      if (starter_card)
        c.owned.push(
          Object.assign(starter_card, GetCardLevelInfo(starter_card))
        );
    });
    return collection;
  });
}

function CanPlayCard(card, player) {
  if (card.market_id) return false;
  if (
    !card.last_transferred_block ||
    !card.last_used_block ||
    card.last_used_player == player
  )
    return true;
  var last_block = getCurrentBlockNum();
  return (
    card.last_transferred_block + 3600 <=
      last_block - settings.transfer_cooldown_blocks ||
    card.last_used_block + 3600 <=
      last_block - settings.transfer_cooldown_blocks
  );
}

function GetCardStats(card) {
  var level = GetCardLevelInfo(card).level;
  var details = cardMap[card.card_detail_id];
  var stats = details.stats;
  if (!stats)
    return {
      mana: 0,
      attack: 0,
      magic: 0,
      armor: 0,
      health: 0,
      speed: 0,
      abilities: [],
      level: 1
    };
  if (details.type == "Summoner")
    return Object.assign(
      {
        abilities: [],
        level: level
      },
      stats
    );
  var abilities = [];
  for (var i = 0; i < level; i++)
    stats.abilities[i].filter(a => a != "").forEach(a => abilities.push(a));
  return {
    mana: stats.mana[level - 1],
    attack: stats.attack[level - 1],
    ranged: stats.ranged ? stats.ranged[level - 1] : 0,
    magic: stats.magic[level - 1],
    armor: stats.armor[level - 1],
    health: stats.health[level - 1],
    speed: stats.speed[level - 1],
    abilities: abilities,
    level: level
  };
}

function GetMaxXp(summoner, summoner_xp, monster) {
  var summoner_rarity = cardMap[summoner.card_detail_id].rarity;
  var monster_rarity = cardMap[monster.card_detail_id].rarity;
  var summoner_level = GetCardLevelInfo({
    card_detail_id: summoner.card_detail_id,
    xp: summoner_xp,
    gold: summoner.gold,
    edition: summoner.edition
  }).level;
  var monster_level = GetCardLevelInfo(monster).level;
  var monster_max = 10 - (monster_rarity - 1) * 2;
  var summoner_max = 10 - (summoner_rarity - 1) * 2;
  var level = Math.min(
    monster_level,
    Math.max(Math.round((monster_max / summoner_max) * summoner_level), 1)
  );
  if (level == monster_level) return monster.xp;
  if (level <= 1) return 0;
  if (monster.edition == 4) {
    let rates = monster.gold
      ? settings.combine_rates_gold[monster_rarity - 1]
      : settings.combine_rates[monster_rarity - 1];
    return rates[level - 1];
  }
  return settings.xp_levels[monster_rarity - 1][level - 2];
}

function GetMaxSummonerXp(rating_level, summoner) {
  var summoner_rarity = cardMap[summoner.card_detail_id].rarity;
  var summoner_level = GetCardLevelInfo(summoner).level;
  var card_max = 10 - (summoner_rarity - 1) * 2;
  var level = Math.min(
    summoner_level,
    Math.max(Math.round((card_max / 4) * rating_level), 1)
  );
  if (level == summoner_level) return summoner.xp;
  if (level <= 1) return 0;
  if (summoner.edition == 4) {
    let rates = summoner.gold
      ? settings.combine_rates_gold[summoner_rarity - 1]
      : settings.combine_rates[summoner_rarity - 1];
    return rates[level - 1];
  }
  return settings.xp_levels[summoner_rarity - 1][level - 2];
}

function IsAllow(c, allowed_cards) {
  if (allowed_cards) {
    if (allowed_cards.foil == "gold_only" && !c.gold) return false;
    if (allowed_cards.type == "no_legendaries" && c.rarity == 4) return false;
    if (allowed_cards.type == "no_legendary_summoners" && c.rarity == 4)
      return false;
    if (
      allowed_cards.editions.length > 0 &&
      !allowed_cards.editions.includes(c.edition)
    )
      return false;
  }
  return true;
}

function FilterCollection(collection, match) {
  var collection_full = [];
  collection.forEach(c => {
    let owned = c.owned
      .filter(c => IsAllow(c, match.allowed_cards))
      .filter(c => CanPlayCard(c, match.player))
      .sort((a, b) =>
        b.level == a.level && b.gold == a.gold
          ? b.uid < a.uid
            ? 1
            : -1
          : (b.gold ? 0.1 : 0) + b.level - ((a.gold ? 0.1 : 0) + a.level)
      );

    if (owned.length > 0) {
      var f = Object.assign(owned[0], GetCardStats(owned[0]));
      f.color = c.color;
      f.type = c.type;
      f.rarity = c.rarity;
      f.name = c.name;
      collection_full.push(f);
    }
  });
  return collection_full;
}

function CalculateDEC(card) {
  var details = cardMap[card.card_detail_id];
  var alpha_bcx = 0,
    alpha_dec = 0;
  var xp = Math.max(card.xp - card.alpha_xp, 0);
  let burn_rate =
    card.edition == 4 || details.tier == 4
      ? settings.dec.untamed_burn_rate[details.rarity - 1]
      : settings.dec.burn_rate[details.rarity - 1];
  if (card.alpha_xp) {
    var alpha_bcx_xp =
      settings[card.gold ? "gold_xp" : "alpha_xp"][details.rarity - 1];
    alpha_bcx = Math.max(
      card.gold ? card.alpha_xp / alpha_bcx_xp : card.alpha_xp / alpha_bcx_xp,
      1
    );
    alpha_dec = burn_rate * alpha_bcx * settings.dec.alpha_burn_bonus;
    if (card.gold) alpha_dec *= settings.dec.gold_burn_bonus;
  }
  var xp_property =
    card.edition == 0 || (card.edition == 2 && details.id < 100)
      ? card.gold
        ? "gold_xp"
        : "alpha_xp"
      : card.gold
      ? "beta_gold_xp"
      : "beta_xp";
  var bcx_xp = settings[xp_property][details.rarity - 1];
  var bcx = Math.max(card.gold ? xp / bcx_xp : (xp + bcx_xp) / bcx_xp, 1);
  if (card.edition == 4 || details.tier == 4) bcx = card.xp;
  if (card.alpha_xp) bcx--;
  var dec = burn_rate * bcx;
  if (card.gold) dec *= settings.dec.gold_burn_bonus;
  if (card.edition == 0) dec *= settings.dec.alpha_burn_bonus;
  if (card.edition == 2) dec *= settings.dec.promo_burn_bonus;
  var total_dec = dec + alpha_dec;
  return total_dec;
}

function GetBurnValues(rarity) {
  let burn_rate = settings.dec.untamed_burn_rate[rarity - 1];
  let rates = settings.combine_rates[rarity - 1];
  return rates.map(l => l * burn_rate);
}

module.exports = {
  GetCollection,
  UserCollection,
  FilterCollection,
  GetCardLevelInfo,
  CanPlayCard,
  GetCardStats,
  GetMaxXp,
  GetMaxSummonerXp,
  IsAllow,
  CalculateDEC,
  GetBurnValues
};
