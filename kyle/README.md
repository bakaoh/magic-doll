# KYLE 

Kyle is a [Golem](https://golem.network/) application that do all the computation to pick the best team to play for each match.

## Why Golem

With the power of Golem supercomputer, Kyle can calculate hundred millions of team combinations within time limit with an acceptable price. You don't have to manage server and pay only for what you use.

An existed image of Kyle in Golem repository can be found at

```
22c45201c7b40d8719bd8da3fae74cf9839bf3ea0770ce5fda846eaf
```

Or build Golem image yourself.

## Prerequisites

- [Docker](https://www.docker.com/products/docker-desktop)
- [Python](https://www.python.org/)
- gvmkit-build

```
$ pip install gvmkit-build
```

## Create Golem image

Build docker image

```
$ docker build . -t bakaoh/kyle
```

Convert into Golem image and push to repository

```
$ gvmkit-build bakaoh/kyle
$ gvmkit-build bakaoh/kyle --push
```

Go [here](https://handbook.golem.network/requestor-tutorials/convert-a-docker-image-into-a-golem-image) for more details.

## Usage

In NodeJs:

```js
const _package = await vm.repo(
    "22c45201c7b40d8719bd8da3fae74cf9839bf3ea0770ce5fda846eaf",
    1,
    1.0
);
```

In Python:

```python
package = await vm.repo(
    image_hash="22c45201c7b40d8719bd8da3fae74cf9839bf3ea0770ce5fda846eaf",
    min_mem_gib=1.0,
    min_storage_gib=1.0,
)
```

## Misc

**SILVER SUN SHADOW / KYLE** - One of the strategists in whom the Silver Sun Emperor places a high degree of confidence. At age 20, he's quite young for a Solar Kingdom strategist, but it was he who drafted the plans for recruiting Psycho Soldiers, and for developing Magic Dolls within Folrart. He and Ishtar are both from an orphanage, and he chose the path of strategist so he could support her and her reckless fighting style. He's currently in charge of a master plan to drag Durendal out onto the battlefield.

