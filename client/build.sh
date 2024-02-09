#!/bin/bash
IMAGE="rockylinux:8-minimal"
NODE="https://nodejs.org/dist/v20.10.0/node-v20.10.0-linux-x64.tar.xz"
MINICONDA="https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh"
YUM_REPO="http://localhost:8080/repos/config/rocky"
NPM_REPO="http://localhost:8080/repos/config/npm"
PIP_REPO="http://localhost:8080/repos/config/pip"

pushd $(dirname $0)
docker build --network=host -t unirepo-client . --build-arg IMAGE=$IMAGE --build-arg NODE=$NODE --build-arg MINICONDA=$MINICONDA --build-arg YUM_REPO=$YUM_REPO --build-arg NPM_REPO=$NPM_REPO --build-arg PIP_REPO=$PIP_REPO
popd