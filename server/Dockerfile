ARG IMAGE
FROM $IMAGE
#prereq
COPY repos /repos
RUN if [ ! -z "$(ls /repos)" ]; then rm -rf /etc/yum.repos.d/*; mv /repos/* /etc/yum.repos.d/.; fi
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
ENV PORT "8080"
ENTRYPOINT ["node","server"]