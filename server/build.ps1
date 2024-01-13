$GIT_HASH=$(git show --no-patch --format=%H)
$GIT_TIMESTAMP=$(git show --no-patch --format=%ci)

docker build -t unirepo . --build-arg GIT_HASH="$GIT_HASH" --build-arg GIT_TIMESTAMP="$GIT_TIMESTAMP"