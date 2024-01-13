$IMAGE="localhost:8081/library/rockylinux:8-minimal"
$NODE="https://nodejs.org/dist/v20.10.0/node-v20.10.0-linux-x64.tar.xz"
$MINICONDA="https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh"

docker pull $IMAGE
docker build --network=host -t unirepo-client . --build-arg IMAGE=$IMAGE --build-arg NODE=$NODE --build-arg MINICONDA=$MINICONDA