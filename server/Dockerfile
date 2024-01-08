ARG IMAGE
FROM $IMAGE
#prereq
RUN microdnf install tar gzip xz curl wget ncurses -y
#node
ARG NODE
RUN wget $NODE --no-check-certificate -O node.tar.xz
RUN mkdir /node && tar -xf node.tar.xz -C /node --strip-components 1 && rm node.tar.xz -f
ENV PATH=$PATH:/node/bin
#install node packages
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