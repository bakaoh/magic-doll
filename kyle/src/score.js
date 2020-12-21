const abilityBaseScore = {
  Affliction: 7, //When a Monster with Affliction hits a target, it has a chance of applying Affliction on the target causing it to be unable to be healed.
  "Divine Shield": 10, //The first time the Monster takes damage it is ignored.
  Enrage: 16, //Has increased Melee attack and Speed when damaged.
  Flying: 2, //Has an increased chance of evading Melee or Ranged attacks from Monsters who do not have the Flying ability.
  "Life Leech": 10, //Monster's health increases each time it damages an enemy Monster's health in proportion to the damage dealt.
  Piercing: 10, //If Melee or Ranged attack damage is in excess of the target's Armor, the remainder will damage the target's Health.
  Poison: 10, //Attacks have a chance to apply poison, which does automatic damage to the target at the beginning of each round after the poison is applied.
  Resurrect: 20, //When a friendly Monster dies it is brought back to life with 1 Health. This ability can only trigger once per battle.
  Triage: 14, //Heals the friendly back-line Monster that has taken the most damage.
  "Knock Out": 2, //Does double damage when attacking an enemy that is stunned.
  Scavenger: 18, //Gains 1 max health each time any monster dies.
  Taunt: 2, //All enemy Monsters target this Monster (if they are able to).
  Oppress: 5, //Does double damage when attacking an enemy that has no attacks.
  Immunity: 10, //This monster is immune to negative status effects.
  "Void Armor": 4, //Magic attacks hit this Monster's armor before its Health.
  Cripple: 4, //Each time an enemy is hit by a Monster with Cripple it loses one max health.
  Halving: 5 //Each time this Monster hits a target, the target's attack is cut in half (rounded down).
};

function scoreTeam(summoner, monsters, match) {
  if (monsters.length > 6 || monsters.length == 0) return -1;

  let team = monsters;
  let ruleset = match.ruleset;
  let opponent = match.opponent;

  // sch: don't use EXPLODING DWARF at first spot in 'Reverse Speed' or 'Melee Mayhem'
  if (ruleset.includes("Reverse Speed") || ruleset.includes("Melee Mayhem")) {
    if (team[0].card_detail_id == 106) return -1;
  }

  // Multifiers
  let attackMul = 8;
  let rangedMul = 10;
  let magicMul = 14;
  let armorMul = 5;
  let speedMul = 3;
  let healthMul = 6;

  // Ruleset modify
  let disableAbilities = [];
  if (ruleset.includes("Unprotected")) {
    armorMul = 0;
    disableAbilities = disableAbilities.concat([
      "Protect",
      "Piercing",
      "Repair",
      "Shatter",
      "Rust"
    ]);
  }
  if (ruleset.includes("Fog of War")) {
    disableAbilities = disableAbilities.concat(["Sneak", "Snipe"]);
  }
  if (ruleset.includes("Healed Out")) {
    healthMul += 1;
    disableAbilities = disableAbilities.concat([
      "Heal",
      "Tank Heal",
      "Life Leech",
      "Triage",
      "Scavenger",
      "Affliction"
    ]);
  }
  if (ruleset.includes("Reverse Speed")) speedMul *= -1;
  if (ruleset.includes("Melee Mayhem")) attackMul += 2;
  if (ruleset.includes("Weak Magic")) magicMul -= 1;
  if (ruleset.includes("Close Range")) rangedMul += 2;
  if (ruleset.includes("Aim True")) {
    attackMul += 1;
    rangedMul += 1;
  }

  if (ruleset.includes("Keep Your Distance")) attackMul = 0;
  if (ruleset.includes("Lost Magic")) magicMul = 0;
  if (ruleset.includes("Broken Arrows")) rangedMul = 0;

  const b2b = ruleset.includes("Back to Basics");
  let score = 0;

  // Summoner modify
  let mod = { attack: 0, ranged: 0, magic: 0, armor: 0, health: 0, speed: 0 };
  if (!ruleset.includes("Silenced Summoners")) {
    if (summoner.attack < 0) score = opponent.melee * attackMul;
    else mod.attack = summoner.attack;
    if (summoner.ranged < 0) score = opponent.ranged * rangedMul;
    else mod.ranged = summoner.ranged;
    if (summoner.magic < 0) score = opponent.magic * magicMul;
    else mod.magic = summoner.magic;
    if (summoner.armor < 0) score = opponent.armor * armorMul;
    else mod.armor = summoner.armor;
    if (summoner.health < 0) score = opponent.total * healthMul;
    else mod.health = summoner.health;
    if (summoner.speed < 0) mod.speed = -1 * mod.speed;
    else mod.speed = summoner.speed;
  }

  // For Equalizer
  let maxHealth = 0;
  for (let monster of team) {
    if (monster.health > maxHealth) maxHealth = monster.health;
  }

  // Summoner abilities
  mod.abilities = [];
  if (summoner.abilities) {
    if (summoner.abilities.includes("Blast")) mod.abilities.push("Blast");
    if (summoner.abilities.includes("Void")) mod.abilities.push("Void");
    if (summoner.abilities.includes("Affliction")) score += 7 * opponent.total;
    if (summoner.abilities.includes("Repair")) score += 4 * armorMul;
    if (summoner.abilities.includes("Tank Heal")) {
      let tank = ruleset.includes("Equalizer") ? maxHealth : team[0].health;
      score += ((tank + mod.health) / 2) * healthMul;
    }
    if (summoner.abilities.includes("Resurrect")) score += 20;
    if (summoner.abilities.includes("Return Fire"))
      mod.abilities.push("Return Fire");
    if (summoner.abilities.includes("Blind"))
      score += ((opponent.melee + opponent.ranged) / 2) * healthMul;
    if (summoner.abilities.includes("Divine Shield"))
      mod.abilities.push("Divine Shield");
    if (summoner.abilities.includes("Thorns")) mod.abilities.push("Thorns");
    if (summoner.abilities.includes("Magic Reflect"))
      mod.abilities.push("Magic Reflect");
    if (summoner.abilities.includes("Flying")) mod.abilities.push("Flying");
    if (summoner.abilities.includes("Piercing")) mod.abilities.push("Piercing");
    if (summoner.abilities.includes("Snare")) mod.abilities.push("Snare");
  }

  const has = (monster, abi) => {
    if (b2b || disableAbilities.includes(abi)) return false;
    if (abi == "Sneak" && ruleset.includes("Super Sneak") && monster.attack > 0)
      return true;
    if (
      abi == "Snipe" &&
      ruleset.includes("Target Practice") &&
      (monster.ranged > 0 || monster.magic > 0)
    )
      return true;
    return monster.abilities.includes(abi) || mod.abilities.includes(abi);
  };

  // Team-wise abilities
  if (ruleset.includes("Armored Up")) mod.armor += 2;
  if (!b2b) {
    for (let monster of team) {
      if (monster.abilities.includes("Inspire")) mod.attack++;
      if (has(monster, "Protect")) mod.armor += 2;
      if (monster.abilities.includes("Strengthen")) mod.health++;
      if (monster.abilities.includes("Swiftness")) mod.speed++;
      if (monster.abilities.includes("Slow")) mod.speed++;
      if (monster.abilities.includes("Demoralize"))
        score += opponent.melee * attackMul;
      if (monster.abilities.includes("Headwinds"))
        score += opponent.ranged * rangedMul;
      if (monster.abilities.includes("Silence"))
        score += opponent.magic * magicMul;
      if (monster.abilities.includes("Weaken"))
        score += opponent.total * healthMul;
      if (monster.abilities.includes("Rust"))
        score += opponent.armor * armorMul;
      if (monster.abilities.includes("Blind"))
        score += ((opponent.melee + opponent.ranged) / 2) * healthMul;
    }
  }

  // Each monster score
  let unit = { melee: 0, ranged: 0, magic: 0, peace: 0, armor: 0 };
  let mrm = 0; // total melee + ranged + magic
  let sso = 0; // Snipe | Sneak | Opportunity
  for (let i in team) {
    let monster = team[i];
    let health = ruleset.includes("Equalizer") ? maxHealth : monster.health;
    health += mod.health;
    score += (monster.armor + mod.armor) * armorMul;
    score += health * healthMul;
    score += (monster.speed + mod.speed) * speedMul;

    if (monster.attack > 0) {
      unit.melee += 1;
      let attack = monster.attack + mod.attack;
      mrm += attack;
      score += attack * attackMul;
      if (i == 0) {
        if (has(monster, "Blast")) score += (attack - 1) * attackMul;
        if (has(monster, "Double Strike")) score += attack * attackMul;
        if (has(monster, "Trample") && attack > 7) score += attack * attackMul;
      } else if (ruleset.includes("Melee Mayhem")) score += 1;
      else if (has(monster, "Sneak")) score += 7;
      else if (has(monster, "Opportunity")) score += 10;
      else if (i == 1 && has(monster, "Reach")) score += 1;
      else {
        score -= attack * attackMul;
        mrm -= attack;
      }
    }
    if (monster.ranged > 0) {
      unit.ranged += 1;
      let ranged = monster.ranged + mod.ranged;
      mrm += ranged;
      score += ranged * rangedMul;
      if (i > 0) {
        if (has(monster, "Blast")) score += (ranged - 1) * rangedMul;
        if (has(monster, "Double Strike")) score += ranged * rangedMul;
      } else if (ruleset.includes("Close Range")) score += 0;
      else {
        score -= ranged * rangedMul;
        mrm -= rangedMul;
      }
    }
    if (monster.magic > 0) {
      unit.magic += 1;
      let magic = monster.magic + mod.magic;
      mrm += magic;
      score += magic * magicMul;
      if (has(monster, "Blast")) score += (magic - 1) * magicMul;
      if (has(monster, "Double Strike")) score += magic * magicMul;
    }
    if (monster.attack + monster.ranged + monster.magic == 0) unit.peace += 1;
    if (monster.armor + mod.armor > 0) unit.armor += 1;

    if (b2b) continue;
    let abiScore = monster.abilities
      .filter(a => !disableAbilities.includes(a) && abilityBaseScore[a])
      .map(a => abilityBaseScore[a])
      .reduce((total, s) => total + s, 0);

    if (has(monster, "Snipe")) {
      abiScore += 10;
      sso |= 1;
    }
    if (has(monster, "Sneak")) sso |= 2;
    if (has(monster, "Opportunity")) sso |= 4;
    if (has(monster, "Heal")) {
      abiScore += (health / 2) * healthMul;
      if (monster.abilities.includes("Last Stand")) abiScore += 4 * healthMul;
    } else {
      if (monster.abilities.includes("Last Stand")) abiScore += 2 * healthMul;
    }

    if (has(monster, "Tank Heal")) {
      let tank = ruleset.includes("Equalizer") ? maxHealth : team[0].health;
      abiScore += ((tank + mod.health) / 2) * healthMul;
    }
    if (has(monster, "Redemption")) abiScore += 2 * opponent.total * healthMul;

    if (ruleset.includes("Earthquake")) {
      if (monster.abilities.includes("Flying")) abiScore += 5 * healthMul;
      if (monster.abilities.includes("Snare")) abiScore += 2 * healthMul;
    }

    if (ruleset.includes("Heavy Hitters")) {
      if (monster.abilities.includes("Stun")) abiScore += 16;
      if (monster.abilities.includes("Cleanse")) abiScore += 10;
    } else {
      if (monster.abilities.includes("Stun")) abiScore += 8;
      if (monster.abilities.includes("Cleanse")) abiScore += 5;
    }

    if (ruleset.includes("Reverse Speed")) {
      if (monster.abilities.includes("Dodge")) abiScore += 2;
    } else {
      if (monster.abilities.includes("Dodge")) abiScore += 10;
    }

    if (ruleset.includes("Armored Up")) {
      if (monster.abilities.includes("Shatter")) abiScore += 2 * armorMul;
      if (monster.abilities.includes("Repair")) abiScore += 4 * armorMul;
    } else {
      if (monster.abilities.includes("Shatter")) abiScore += armorMul;
      if (monster.abilities.includes("Repair")) abiScore += 2 * armorMul;
    }

    if (i == 0) {
      if (monster.abilities.includes("Magic Reflect")) abiScore += 2 * magicMul;
      if (monster.abilities.includes("Return Fire")) abiScore += 2 * rangedMul;
      if (monster.abilities.includes("Retaliate")) abiScore += 2 * attackMul;
      if (monster.abilities.includes("Thorns")) abiScore += 2 * attackMul;
      if (monster.abilities.includes("Void")) abiScore += 4 * healthMul;
      if (monster.abilities.includes("Shield")) abiScore += 5 * healthMul;
    } else {
      if (monster.abilities.includes("Magic Reflect")) abiScore += magicMul;
      if (monster.abilities.includes("Return Fire")) abiScore += rangedMul;
      if (monster.abilities.includes("Retaliate")) abiScore += attackMul;
      if (monster.abilities.includes("Thorns")) abiScore += attackMul;
      if (monster.abilities.includes("Void")) abiScore += 2 * healthMul;
      if (monster.abilities.includes("Shield")) abiScore += 2 * healthMul;
    }
    score += abiScore;
  }

  if (unit.melee == 0) score -= 20;
  if (unit.peace * 2 >= team.length || mrm * 3 < match.mana_cap) score -= 100;
  if (![0, 1, 2, 4].includes(sso)) score -= 30;
  if (ruleset.includes("Up Close & Personal")) {
    if (["Black", "Red"].includes(summoner.color)) score += 1000;
  }
  if (ruleset.includes("Earthquake")) {
    if ([56, 88, 130, 200, 205, 224, 235].includes(summoner.card_detail_id))
      score += 20;
  }

  return score;
}

module.exports = scoreTeam;
