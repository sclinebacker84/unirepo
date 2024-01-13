FROM alpine:3.19.0
#prereq
RUN apk add tar gzip xz curl wget ncurses nodejs npm
# install node packages
WORKDIR /webapp
COPY package.json .
RUN npm install
#copy static files
COPY vite.config.js index.html .
COPY src/ ./src/
RUN npm run build
#copy server files
COPY server/ ./server/
COPY template/ ./template/
COPY repos.json .
ENV PORT "8080"
#inject git info
ARG GIT_HASH
ARG GIT_TIMESTAMP
ENV GIT_HASH $GIT_HASH
ENV GIT_TIMESTAMP $GIT_TIMESTAMP
ENTRYPOINT ["node","server"]