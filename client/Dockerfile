ARG IMAGE
FROM $IMAGE
#setup rocky repo
RUN microdnf install curl tar wget xz -y && \
rm -rf /etc/yum.repos.d/* && \
curl http://localhost:8080/browse/repo_files/rocky.repo > /etc/yum.repos.d/rocky.repo
#setup npm repo
ARG NODE
RUN wget $NODE --no-check-certificate -O node.tar.xz
RUN mkdir /node && tar -xf node.tar.xz -C /node --strip-components 1 && rm node.tar.xz -f
ENV PATH=$PATH:/node/bin
RUN curl http://localhost:8080/browse/repo_files/npm.repo > ~/.npmrc
#setup pip repo
ARG MINICONDA
RUN mkdir -p ~/miniconda3 && wget $MINICONDA --no-check-certificate -O ~/miniconda3/miniconda.sh && bash ~/miniconda3/miniconda.sh -b -u -p ~/miniconda3 && rm -rf ~/miniconda3/miniconda.sh
ENV PATH=$PATH:/root/miniconda3/bin
RUN mkdir -p ~/.pip && curl http://localhost:8080/browse/repo_files/pip.repo > ~/.pip/pip.conf
ENTRYPOINT ["bash"]