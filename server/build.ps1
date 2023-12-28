$IMAGE="rockylinux:8-minimal"
$NODE="https://nodejs.org/dist/v20.10.0/node-v20.10.0-linux-x64.tar.xz"
mkdir -p repoconfig
docker build -t unirepo . --build-arg IMAGE=$IMAGE --build-arg NODE=$NODE