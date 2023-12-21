# building

- install docker

```
# linux
./build.sh
# windows
./build.ps1
```

# running
```
docker run --rm -d --name unirepo -p 8080:8080 -v ./files:/files -v ./repos:/repos unirepo
```