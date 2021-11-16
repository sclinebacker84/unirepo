# unirepo
 ```
## Creating a new centos client workstation to "populate" the cache
- copy the .repo files from repo_files to their appropriate locations on the workstation
- run the following commands
```
yum clean all
yum check-update
yum install epel-release centos-release-scl -y
```
- install yum libraries
```
yum install mono-complete java-1.8.0-openjdk-devel jq openssl wget unzip sysvinit-tools initscripts file clamav clamd psmisc udftools c-ares wireshark wkhtmltopdf bzip2 libsmi cups dconf p7zip p7zip-plugins xorg-x11-fonts-Type1 xorg-x11-fonts-75dpi ImageMagick ImageMagick-c++ perl qt5-qtbase-gui pulseaudio-libs-glib2 xsp git python3-tkinter net-tools docker nano make libreoffice
```
- install npm (just download the x64 linux tar.gz)
- create a tmp folder, cd into it, and install npm libraries
```
npm install async-exit-hook argparse axios better-sqlite3 aws-sdk moment compression multer fs-extra jsonwebtoken helmet mysql2 pg pg-format node-schedule pm2 replace-in-file simple-git uuid simple-encryptor yaml winston express glob ip isstream md5-file serve-index sha256-file tar
```
- install miniconda
- create an initial conda environment
```
conda create -n sample -q python=3.9
```
- install pip libraries
```
pip install python-dateutil pyyaml pandas scikit-learn pyinstaller pyarmor simplejson aws-encryption-sdk conda-pack boto3 requests flask django pyorc fastparquet pyarrow python-magic
```

## docker images
### install docker images, append host:port+1 to image name
- library/centos
  - centos7
  - centos7.9.2009
- library/ubuntu
  - rolling
- gitlab/gitlab-ce
  - latest
- jenkins/jenkins
  - latest
- library/mysql
  - 8.0.27
- library/postgres
  - 14.1
- library/elasticsearch
  - 7.14.2
- library/alpine
  - 3.14.3
  
## Building better-sqlite3 dependency
 - Python 3.x (recommend using conda)
 ```
 yum install centos-release-scl -y
 rm -f /etc/yum.repos.d/Cent* /etc/yum.repos.d/epel*
 yum groupinstall 'Development Tools'
 yum install devtoolset-7 -y
 scl enable devtoolset-7 bash
 npm install node-gyp
 npm install better-sqlite3
