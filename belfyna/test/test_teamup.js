const { UserCollection, FilterCollection } = require("../../kyle/src/card");
const teamup = require("../src/teamup");

const match = {
  id: "ce5a68286cde6fe2502bea359cc2c7dca56299f4",
  player: "bakaoh",
  match_type: "Ranked",
  mana_cap: 99,
  current_streak: 1,
  ruleset: "Standard",
  inactive: "",
  settings: '{"rating_level":4}',
  opponent: "616f65891a92a79e25fa9bb2161c716460108e4c",
  opponent_player: "limier",
  prefer_color: "",
  rating_level: 4
};

UserCollection("bakaoh").then(full => {
  const collection = FilterCollection(full, match);
  teamup(collection, match);
});
