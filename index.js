const REPO_TYPES = ['npm','yum','conda','pip','docker','raw']

const tar = require('tar')
const express = require('express')
const moment = require('moment')
const fs = require('fs-extra')
const path = require('path')
const proxy = require('express-http-proxy')
const exitHook = require('async-exit-hook')
const winston = require('winston')
const serveIndex = require('serve-index')
const md5Hash = require('md5-file')
const multer = require('multer')
const upload = multer({storage:multer.diskStorage({
    destination:(req,file,cb) => {
        const p = path.join(filepath,req.headers['x-group'])
        fs.mkdirpSync(p)
        cb(null,p)
    },
    filename:(req,file,cb) => cb(null,file.originalname)
})})

const logger = winston.createLogger({
    transports:[new winston.transports.Console()],
    format:winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(info => `[${info.level}] ${info.timestamp}: ${info.message}`)
    )
})

const dbpath = path.join(__dirname, 'repos.db')
const db = require('better-sqlite3')(dbpath)
const repopath = path.join(__dirname, 'repos')
const filepath = path.join(__dirname, 'files')

const req2Path = req => path.join(repopath,req.params.name,req.path)
const initDb = async () => {
    logger.info('initializing db')
    try{
        db.exec(`
            create table repos(name text,url text,type text);
            create unique index repos_name_unique on repos(name);
            create table files(filename text, reponame text, md5 text, added_on datetime default current_timestamp);
            create unique index files_filename_unique on files(filename);
            create index files_reponame_added_on on files(reponame,added_on);
            create table backups(reponame text, ran_on datetime default current_timestamp, foreign key(reponame) references repos(name));
            create index backups_reponame_ran_on_datetime on backups(reponame,ran_on);
        `)
    }catch(e){
        logger.error(e)
        logger.info('db already initialized')
    }
    logger.info('initdb complete')
}

fs.mkdirpSync(repopath)
fs.mkdirpSync(filepath)
initDb()

const app = express()

app.use(express.static(path.join(__dirname,'static')))
app.use('/browse/repos',serveIndex(repopath,{icons:true,view:'details'}))
app.use('/browse/repos',express.static(repopath))
app.use('/browse/files',serveIndex(filepath,{icons:true,view:'details'}))
app.use('/browse/files',express.static(filepath))

const addFile = db.prepare('insert into files(filename,reponame,md5) values(?,?,?)')
const proxyHandler = proxy(
    req => db.prepare('select url from repos where name = ?').get(req.params.name).url, 
    {
        userResDecorator:(proxyRes, data, req, res) => {
            const p = req2Path(req)
            logger.debug(`fetching remote file: ${proxyRes.req.protocol}//${proxyRes.req.host}${proxyRes.req.path}`)
            fs.mkdirpSync(path.dirname(p))
            fs.writeFileSync(p, data)
            addFile.run(p,req.params.name,md5Hash.sync(p))
            logger.debug(`added entry to files: ${p}`)
            return data
        }
    }
)
app.use('/repository/:name', (req,res,next) => {
    const p = req2Path(req)
    if(fs.pathExistsSync(p)){
        logger.debug(`found cached file: ${p}`)
        return res.sendFile(p)
    }
    proxyHandler(req,res,next)
})

app.post('/files',upload.array('files'),(req,res,next) => {
    res.sendStatus(200)
})

const relatizePath = (p) => path.relative(__dirname,p)

app.get('/backup/:name/full.tar.gz',(req,res,next) => {
    db.prepare('insert into backups (reponame) values (?)').run(req.params.name)
    tar.c({gzip:true},[relatizePath(path.join(repopath,req.params.name))]).pipe(res)
    logger.info(`performing full backup of ${req.params.name} repo`)
})
app.get('/backup/:name/incremental.tar.gz',(req,res,next) => {
    const backup = db.prepare('select ran_on from backups where reponame = ? order by ran_on desc limit 1').get(req.params.name)
    const files = db.prepare('select filename from files where reponame = ? and added_on >= ?').all(req.params.name, backup.ran_on)
    if(!files.length){
        return res.sendStatus(200)
    }
    db.prepare('insert into backups (reponame) values (?)').run(req.params.name)
    tar.c({gzip:true},files.map(f => relatizePath(f.filename))).pipe(res)
})

app.use(express.json())

app.get('/info', (req,res,next) => {
    const repos = db.pragma('table_info(repos)')
    res.send({schema:{repos},repos:{types:REPO_TYPES}})
})

app.post('/repo',(req,res,next) => {
    if(!req.body.name){
        next(new Error('missing name in request body'))
    }
    res.send(db.prepare('insert into repos (name, url, type) values (:name,:url,:type) on conflict(name) do update set url = :url').run(req.body))
    logger.info(`saved repo: ${req.body.name}`)
})

app.get('/repo',(req,res,next) => {
    res.send(db.prepare('select * from repos').all())
})

const walk = (dir,func) => {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file)
        if(fs.lstatSync(fullPath).isDirectory()){
            walk(fullPath, func)
        }else{
            func(fullPath)
        }  
    })
}
app.post('/rebuild/:name',(req,res,next) => {
    const files = []
    walk(path.join(repopath,req.params.name), file => files.push([file,req.params.name,md5Hash.sync(file)]))
    db.transaction(data => data.forEach(d => addFile.run(d)))(files)
    logger.info(`rebuilt ${files.length} files in repo ${req.params.name}`)
    res.send({count:files.length})
})

app.listen(8080, () => logger.info('started'))

exitHook(() => {
    db.close()
    logger.info('\nbye')
})