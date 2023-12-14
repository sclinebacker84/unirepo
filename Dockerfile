ARG IMAGE
FROM $IMAGE
SHELL ["/bin/bash","-c"]
#prereq
RUN touch ~/.bashrc && microdnf install tar gzip xz curl wget ncurses jq findutils which -y
#conda
RUN mkdir -p ~/miniconda3 && \
wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -O ~/miniconda3/miniconda.sh && \
bash ~/miniconda3/miniconda.sh -b -u -p ~/miniconda3 && \
rm -rf ~/miniconda3/miniconda.sh
#node
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash && source ~/.bashrc && nvm install node
#install libs
# RUN source ~/.bashrc && npm install