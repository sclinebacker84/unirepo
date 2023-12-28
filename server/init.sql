create table repos(name text,url text,type text);
create unique index repos_name_unique on repos(name);

create table files(filename text, reponame text, md5 text, added_on datetime default current_timestamp);
create unique index files_filename_reponame_unique on files(filename,reponame);
create index files_reponame_added_on on files(reponame,added_on);

create table backups(reponame text, ran_on datetime default current_timestamp);
create index backups_reponame_ran_on_datetime on backups(reponame,ran_on);

insert into repos(name,url,type) values 
('yum','http://mirror.centos.org/','yum'),
('epel','http://download.fedoraproject.org/','yum'),
('mono','https://download.mono-project.com/','yum'),
('conda','https://repo.anaconda.com','conda'),
('pip','https://pypi.org/','pip'),
('npm','https://registry.npmjs.org/','npm'),
('nux','http://mirror.li.nux.ro/li.nux.ro/nux/dextop/el7/','yum'),
('rocky','http://dl.rockylinux.org/pub/rocky/8/','rocky'),
('rocky-epel','https://dl.fedoraproject.org/pub/epel/8/Everything/','rocky')