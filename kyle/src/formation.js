function positionPoint(c) {
  let p = 0;
  if (c.attack > 0) p += 4;
  if (c.magic > 0) p += 1;
  if (c.attack + c.magic + c.ranged == 0) p += c.health;
  if (c.attack > 0 && c.health + c.armor >= 5) p += 3;
  if (c.magic > 0 && c.health + c.armor >= 5) p += 2;
  if (c.health + c.armor <= 3) p += 1;

  if (c.abilities.includes("Shield")) {
    if (c.attack > 0) p += 3;
    else if (c.ranged > 0) p -= 3;
    else if (c.magic == 0) p += 3;
  }
  if (c.abilities.includes("Magic Reflect")) {
    if (c.attack > 0) p += 2;
    else if (c.ranged > 0) p -= 2;
    else if (c.magic == 0) p += 2;
  }
  if (c.abilities.includes("Heal")) {
    if (c.ranged > 0) p -= 3;
    else p += 2;
  }

  if (c.abilities.includes("Flying")) p += 1;
  if (c.abilities.includes("Dodge")) p += 1;
  if (c.abilities.includes("Retaliate")) p += 3;
  if (c.abilities.includes("Reach")) p -= 2;
  if (c.abilities.includes("Sneak")) p -= 2;
  if (c.abilities.includes("Last Stand")) p -= 3;
  if (c.abilities.includes("Redemption")) p += 4;
  if (c.abilities.includes("Taunt")) p += 4;

  return p;
}

function sortTeam(team) {
  let pp = {};
  team.forEach(c => (pp[c.card_detail_id] = positionPoint(c)));
  return team.sort((c1, c2) => pp[c2.card_detail_id] - pp[c1.card_detail_id]);
}

module.exports = sortTeam;
