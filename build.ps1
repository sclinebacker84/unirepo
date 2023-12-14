$IMAGE="rockylinux:8-minimal"

docker build -t unirepo . --build-arg IMAGE=$IMAGE 