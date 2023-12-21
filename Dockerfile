ARG IMAGE
FROM $IMAGE
#prereq
COPY extra /extra
RUN microdnf install tar gzip xz curl wget ncurses jq findutils which python38 make gcc gcc-c++ -y
#node
RUN mkdir /node && tar -xf /extra/node.tar.xz -C /node --strip-components 1
ENV PATH=$PATH:/node/bin
#install node packages
WORKDIR /webapp
RUN npm install better-sqlite3 argparse async-exit-hook axios express fs-extra glob ip isstream md5-file moment multer serve-index sha256-file tar winston --save
COPY index.js init.sql .
COPY repo_files/ /repo_files/
COPY static/ /static/
#cleanup
RUN rm -rf /extra