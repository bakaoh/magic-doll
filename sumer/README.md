# SUMER

Sumer is a DeFi application that people may delegate their [Splinterland](https://steemmonsters.com?ref=bakaoh) card to earn passive income.

Sumer use [Kyle](https://github.com/bakaoh/magic-doll/tree/master/kyle) to make an autoplay bot that keep playing and earning reward. Rewards will be split to card delegators.

[POC](http://idlesplinter.xyz/sumer)

## Prerequisites

- [Node](https://nodejs.org/en/)
- [Yarn](https://classic.yarnpkg.com/en/docs/install/)
- Yagna requestor [app key](https://handbook.golem.network/requestor-tutorials/flash-tutorial-of-requestor-development#generate-the-app-key)

## Usage

Install `yarn` dependencies

```
$ cd sumer/
$ yarn
```

Add environment variable 

```
export YAGNA_APPKEY=your_yagna_app_key_here
```

Run the service

```
$ node src/index.js
```

Or start and monitor with [pm2](https://www.npmjs.com/package/pm2)

```
$ pm2 start ecosystem.config.js --only sumer
```

## Manage Pool

Use `node` REPL from `sumer` directory

```js
$ node
> const storage = require("./src/storage")
> storage.addPool(accountname, postingkey, creator)
> storage.listPool().then(console.log)
```

## Misc

**DOLL MASTER / SUMER** - Then infamous twisted witch who invented the Magic Dolls. She was friends with Black Cat Fellana. When they were studying for Fellana's theses, 'The Principles of Bad Luck,' together, she was inspired to create a golem in the shape of a girl. It's very hard to tell what she's really thinking, but it's clear she's as temperamental as she is brilliant.