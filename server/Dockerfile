ARG IMAGE
FROM $IMAGE
#prereq
COPY repoconfig /repos
RUN if [ ! -z "$(ls /repos)" ]; then rm -rf /etc/yum.repos.d/*; mv /repos/* /etc/yum.repos.d/.; fi
RUN microdnf install tar gzip xz curl wget ncurses jq findutils which python38 make gcc gcc-c++ -y
#node
ARG NODE
RUN wget $NODE --no-check-certificate -O node.tar.xz
RUN mkdir /node && tar -xf node.tar.xz -C /node --strip-components 1 && rm node.tar.xz -f
ENV PATH=$PATH:/node/bin
#install node packages
WORKDIR /webapp
RUN npm install better-sqlite3 argparse async-exit-hook axios express fs-extra glob ip isstream md5-file moment multer serve-index sha256-file tar winston --save
COPY index.js init.sql .
COPY repo_files/ /repo_files/
COPY static/ /static/
ENTRYPOINT ["node","index.js"]