#!/bin/bash
$IMAGE="rockylinux:8-minimal"
pushd $(dirname $0)
if [ "$1" == "refresh" ]; then
    rm extra -rf
    mkdir extra -p
    wget https://nodejs.org/dist/v20.10.0/node-v20.10.0-linux-x64.tar.xz -O extra/node.tar.xz
fi
docker build -t unirepo . --build-arg IMAGE=$IMAGE
popd