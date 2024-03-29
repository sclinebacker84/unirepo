#!/bin/bash
IMAGE="${IMAGE:-rockylinux:8-minimal}"
NODE="${NODE:-https://nodejs.org/dist/v20.10.0/node-v20.10.0-linux-x64.tar.xz}"
GIT_HASH=$(git show --no-patch --format=%H)
GIT_TIMESTAMP=$(git show --no-patch --format=%ci)

pushd $(dirname $0)
docker build -t unirepo . --build-arg IMAGE=$IMAGE --build-arg NODE=$NODE --build-arg GIT_HASH="$GIT_HASH" --build-arg GIT_TIMESTAMP="$GIT_TIMESTAMP"
popd