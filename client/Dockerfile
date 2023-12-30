ARG IMAGE
FROM $IMAGE
ENV PATH=$PATH:/node/bin:/root/miniconda3/bin
#setup rocky repo
RUN microdnf install curl tar wget xz nano ncurses -y && \
rm -rf /etc/yum.repos.d/*; \
curl --connect-timeout 2 http://localhost:8080/repos/config/rocky > /etc/yum.repos.d/rocky.repo || echo 0
#setup npm repo
ARG NODE
RUN wget $NODE --no-check-certificate -O node.tar.xz && \
mkdir /node && \
tar -xf node.tar.xz -C /node --strip-components 1 && \
rm node.tar.xz -f; \
curl --connect-timeout 2 http://localhost:8080/repos/config/npm > ~/.npmrc || echo 0
#setup pip repo
ARG MINICONDA
RUN mkdir -p ~/miniconda3 && \
wget $MINICONDA --no-check-certificate -O ~/miniconda3/miniconda.sh && \
bash ~/miniconda3/miniconda.sh -b -u -p ~/miniconda3 && \
rm -rf ~/miniconda3/miniconda.sh && \
mkdir -p ~/.pip; \
curl --connect-timeout 2 http://localhost:8080/repos/config/pip > ~/.pip/pip.conf || echo 0
ENTRYPOINT ["bash"]