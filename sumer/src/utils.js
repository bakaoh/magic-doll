const axios = require("axios");

const headers = {
  "X-Requested-With": "XMLHttpRequest",
  "Accept-Encoding": "gzip",
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.87 Safari/537.36",
  Cookie:
    "_ga=GA1.2.149460222.1570505717; _fbp=fb.1.1571787049592.1217522710; _gid=GA1.2.1993652198.1574393006",
  Referer: "https://steemmonsters.com/?p=market"
};

function getApi(url, data, player) {
  if (data == null || data == undefined) data = {};
  if (player) {
    data.token = player.token;
    data.username = player.name;
  }
  data.v = new Date().getTime();
  return axios
    .get("https://game-api.splinterlands.com" + url, { headers, params: data })
    .then(res => res.data);
}

function getApiIo(url, data, player) {
  if (data == null || data == undefined) data = {};
  if (player) {
    data.token = player.token;
    data.username = player.name;
  }
  data.v = new Date().getTime();
  return axios
    .get("https://api.steemmonsters.io" + url, { headers, params: data })
    .then(res => res.data);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const card_image_url = "https://d36mxiodymuqjm.cloudfront.net/cards_v2.2/";
const beta_card_url = "https://d36mxiodymuqjm.cloudfront.net/cards_beta/";
const untamed_card_url =
  "https://steemmonsters.s3.amazonaws.com/cards_untamed/";

function getCardImage(name, edition) {
  let base_url = card_image_url;
  switch (edition) {
    case 1:
    case 3:
      base_url = beta_card_url;
      break;
    case 4:
      base_url = untamed_card_url;
  }
  return `${base_url}${encodeURIComponent(name)}.png`;
}

module.exports = {
  getApi,
  getApiIo,
  sleep,
  getCardImage
};
