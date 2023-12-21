$IMAGE="rockylinux:8-minimal"

if($args.count -eq 1 -and $args[0] -eq "refresh"){
    rm extra -r -fo
    mkdir extra -fo
    wget https://nodejs.org/dist/v20.10.0/node-v20.10.0-linux-x64.tar.xz -OutFile extra/node.tar.xz
}
docker build -t unirepo . --build-arg IMAGE=$IMAGE