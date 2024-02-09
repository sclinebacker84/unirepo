ARG IMAGE
FROM $IMAGE
ENV PATH=$PATH:/node/bin:/root/miniconda3/bin
#setup rocky repo
ARG YUM_REPO
RUN rm -rf /etc/yum.repos.d/*; \
curl --connect-timeout 2 $YUM_REPO > /etc/yum.repos.d/rocky.repo || echo 0; \
microdnf clean all; \
microdnf install tar wget xz nano ncurses dnf -y
#setup npm repo
ARG NODE
ARG NPM_REPO
RUN wget $NODE --no-check-certificate -O node.tar.xz && \
mkdir /node && \
tar -xf node.tar.xz -C /node --strip-components 1 && \
rm node.tar.xz -f; \
curl --connect-timeout 2 $NPM_REPO > ~/.npmrc || echo 0
#setup pip repo
ARG PIP_REPO
ARG MINICONDA
RUN mkdir -p ~/miniconda3 && \
wget $MINICONDA --no-check-certificate -O ~/miniconda3/miniconda.sh && \
bash ~/miniconda3/miniconda.sh -b -u -p ~/miniconda3 && \
rm -rf ~/miniconda3/miniconda.sh && \
mkdir -p ~/.pip; \
curl --connect-timeout 2 $PIP_REPO > ~/.pip/pip.conf || echo 0
ENTRYPOINT ["bash"]