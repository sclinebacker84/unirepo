const axios = require('axios')
const isStream = require('isstream');
const ip = require('ip')
const tar = require('tar')
const express = require('express')
const fs = require('fs-extra')
const path = require('path')
const exitHook = require('async-exit-hook')
const winston = require('winston')
const serveIndex = require('serve-index')
const md5Hash = require('md5-file')
const sha256File = require('sha256-file')
const multer = require('multer')
const Duplex = require('stream').Duplex
const {ArgumentParser} = require('argparse')
const glob = require('glob')
const moment = require('moment');
const { npm } = require('winston/lib/winston/config');

const parser = new ArgumentParser()
parser.add_argument("-p","--port",{type:'int',default:8080})
parser.add_argument("-l","--loglevel",{type:'str',default:'info',choices:['info','debug']})
parser.add_argument("-c","--cacheonly",{type:'int',default:0,choices:[0,1]})
const args = parser.parse_args()

const REPO_TYPES = ['npm','yum','conda','pip']

const ENCODING = 'utf-8'
const TRAILING_SLASH_RE = /\/$/
const ES = '', SL = '/', DS = '$', CS = ', '

const PYTHON_HOSTED = {
    url:'https://files.pythonhosted.org',
    suffix:'-python-hosted'
}
const DOCKER = {
    url:'https://registry-1.docker.io',
    service:'registry.docker.io',
    reponame:'docker',
    api:'/v2/',
    host:`${ip.address()}:${args.port+1}`,
    headers:{
        authenticate:'www-authenticate',
        badAccept:new Set(['application/vnd.docker.distribution.manifest.list.v2+json']),
        contentType:{
            manifest:'application/vnd.docker.distribution.manifest.v2+json',
            blob:'application/octet-stream'
        }
    },
    tokens:{
        value:undefined,
        refresh:(scope) => axios.get('https://auth.docker.io/token',{params:{scope,service:DOCKER.service}}).then(response => DOCKER.tokens.value = response.data.token)
    }
}

const SKIP_HEADERS = ['connection','content-length','host']

const upload = multer({storage:multer.diskStorage({
    destination:(req,file,cb) => {
        const p = path.join(filepath,req.headers['x-group'])
        fs.mkdirpSync(p)
        cb(null,p)
    },
    filename:(req,file,cb) => cb(null,file.originalname)
})})

const extend = (obj, source, skips) => {
    if(source){
        for (const prop in source) {
            if (!(skips && skips.includes(prop))){
                obj[prop] = source[prop]
            }
        }
    }
    return obj
}

const logger = winston.createLogger({
    transports:[new winston.transports.Console()],
    format:winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(info => `[${info.level}] ${info.timestamp}: ${info.message}`)
    ),
    level:args.loglevel
})

const dbpath = path.join(__dirname, 'repos.db')
const db = require('better-sqlite3')(dbpath)
const repopath = path.join(__dirname, 'repos')
const filepath = path.join(__dirname, 'files')

fs.mkdirpSync(repopath)
fs.mkdirpSync(filepath)

logger.info('initializing db')
try{
    db.exec(fs.readFileSync(path.join(__dirname,'init.sql'), ENCODING))
    db.prepare('insert into repos(name,url,type) values (?,?,?)').run(DOCKER.reponame,DOCKER.url,DOCKER.reponame)
}catch(e){
    logger.error(e)
}
logger.info('initdb complete')

logger.info('generating template files')
glob(path.join(__dirname,'repo_files','*.template'),undefined,(e,files) => {
    files.forEach(file => {
        logger.debug(`processing template file ${file}`)
        fs.writeFileSync(file.replace('.template', ES), fs.readFileSync(file,ENCODING).replaceAll('$host',ip.address()).replaceAll('$port',args.port))
    })
    logger.info('generated template files')
})

const app = express()

app.use(express.static(path.join(__dirname,'static')))
app.use('/browse/repos',serveIndex(repopath,{icons:true,view:'details'}))
app.use('/browse/repos',express.static(repopath))
app.use('/browse/files',serveIndex(filepath,{icons:true,view:'details'}))
app.use('/browse/files',express.static(filepath))
app.use('/browse/repo_files',express.static(path.join(__dirname,'repo_files')))

const addFile = db.prepare('insert into files(filename,reponame,md5) values(:filename,:reponame,:md5) on conflict(filename,reponame) do update set md5 = :md5')
const getRepo = db.prepare('select type,url from repos where name = ?')

const req2Path = req => {
    const reponame = req.params.name || DOCKER.reponame
    let p = path.join(repopath,reponame,req.path)
    switch(getRepo.get(reponame).type){
        case 'npm':
            p = !req.path.substring(1).includes(SL) ? p.replace(req.path, req.path+DS) : p
            break
        case 'pip':
            p = p.replace(TRAILING_SLASH_RE, ES)
            break
    }
    return p
}
const buffer2Stream = buffer => {
    const stream = new Duplex()
    stream.push(buffer)
    stream.push(null)
    return stream
}
const axios2Express = (axRes,exRes) => {
    exRes.set(axRes.headers)
    exRes.status(axRes.status)
}
const proxy = (reponame, opts, req, res) => {
    let p = req2Path(req)
    logger.debug(`fetching file ${p} from ${opts.url} ${opts.method}`)
    return axios(opts).then(response => {
        axios2Express(response,res)
        let data = response.data
        switch(getRepo.get(reponame).type){
            case 'pip':
                data = data.toString().replaceAll(PYTHON_HOSTED.url,`http://${ip.address()}:${args.port}/repository/${req.params.name}${PYTHON_HOSTED.suffix}`)
                break
        }
        data = isStream(data) ? data : buffer2Stream(data)
        if(opts.method.toUpperCase() != 'HEAD' && response.status < 300){
            fs.mkdirpSync(path.dirname(p))
            const stream = data.pipe(fs.createWriteStream(p))
            stream.on('finish',() => {
                logger.debug(`wrote fetched file: ${p}`)
                addFile.run({filename:p,reponame,md5:md5Hash.sync(p)})
                logger.debug(`added entry to files: ${p}`)
                res.sendFile(p)
            })
        }else{
            data.pipe(res)
        }
        return response
    })
}

const CACHE_HANDLERS = {
    docker:(p,req,res) => {
        const isManifest = req.path.includes('manifests')
        res.set({
            'docker-distribution-api-version':'registry/2.0',
            'content-type':isManifest ? DOCKER.headers.contentType.manifest : DOCKER.headers.contentType.blob
        })
        if(req.method == 'HEAD' && isManifest){
            res.set('docker-content-digest', 'sha256:'+sha256File(p))
        }
    },
    pip:(p,req,res) => {
        res.type('text/html')
    }
}
const MOD_ERR_HANDLERS = {
    docker:(err,req,res,next) => {
        if(!err.response){
            return next(err)
        }
        let h = err.response.headers[DOCKER.headers.authenticate]
        err.response.headers[DOCKER.headers.authenticate] = err.response.headers[DOCKER.headers.authenticate].replace(DOCKER.service, DOCKER.host)
        axios2Express(err.response,res)
        if(h){
            h = h.replace('Bearer ',ES).split(',').map(p => p.split('=').map(k => k.replaceAll('"', ES)))
            const scope = h.find(p => p[0] == 'scope')
            DOCKER.tokens.refresh(scope && scope[1]).then(() => res.end())
        }
    }
}

const checkCache = (req,res,next) => {
    const p = req2Path(req)
    const reponame = req.params.name || DOCKER.reponame
    logger.debug(`looking for file: ${p} for repo: ${reponame}`)
    if(fs.pathExistsSync(p)){
        const f = fs.lstatSync(p)
        logger.debug(`found cached file: ${p}`)
        const h = CACHE_HANDLERS[getRepo.get(reponame).type]
        h && h(p,req,res)
        if(f.isFile()){
            res.sendFile(p)
        }else{
            res.sendStatus(200)
        }
    }else if(args.cacheonly){
        res.sendStatus(404)
    }else{
        next()
    }
}
const modCache = (req,res,next) => {
    const reponame = req.params.name || DOCKER.reponame
    const t = getRepo.get(reponame)
    const opts = {
        method:req.method,
        url:t.url.replace(TRAILING_SLASH_RE,ES) + req.path,
        responseType:'arraybuffer',
        headers:extend({'connection':'close'},req.headers,SKIP_HEADERS)
    }
    switch(t.type){
        case 'docker':
            opts.url = DOCKER.url + req.path
            if(req.path.includes('blobs')){
                opts.responseType = 'stream'
            }
            if(DOCKER.tokens.value && req.method != 'HEAD'){
                opts.headers.authorization = `Bearer ${DOCKER.tokens.value}`
                if(opts.headers.accept){
                    opts.headers.accept = opts.headers.accept.split(CS).filter(p => !DOCKER.headers.badAccept.has(p)).join(CS)
                }
            }
            break
    }
    proxy(reponame, opts, req, res).catch(err => MOD_ERR_HANDLERS[t.type] ? MOD_ERR_HANDLERS[t.type](err,req,res,next) : next(err))
}

app.use('/repository/:name', checkCache, modCache)

app.post('/files',upload.array('files'),(req,res,next) => {
    res.sendStatus(200)
})

const relatizePath = (p) => path.relative(__dirname,p)

const fullBackup = (req,res,next) => {
    db.prepare('insert into backups (reponame) values (?)').run(req.params.name)
    res.set('content-disposition',`attachment; filename=${req.params.name}.full.tar.gz`)
    logger.info(`performing full backup of ${req.params.name} repo`)
    const stream = tar.c({gzip:true},[relatizePath(path.join(repopath,req.params.name))]).pipe(res)
    stream.on('finish',() => {
        logger.info(`done performing full backup of ${req.params.name} repo`)
    })
}
app.get('/backup/full/:name',fullBackup)
app.get('/backup/incremental/:name',(req,res,next) => {
    const backup = db.prepare('select ran_on from backups where reponame = ? order by ran_on desc limit 1').get(req.params.name)
    if(!backup){
        return fullBackup(req,res,next)
    }
    const files = db.prepare('select filename from files where reponame = ? and added_on >= ?').all(req.params.name, backup.ran_on)
    if(!files.length){
        return res.sendStatus(200)
    }
    db.prepare('insert into backups (reponame) values (?)').run(req.params.name)
    res.set('content-disposition',`attachment; filename=${req.params.name}.${moment().toString()}.incremental.tar.gz`)
    logger.info(`performing incremental backup of ${req.params.name} repo`)
    const stream = tar.c({gzip:true},files.map(f => relatizePath(f.filename))).pipe(res)
    stream.on('finish', () => {
        logger.info(`done performing incremental backup of ${req.params.name} repo`)
    })
})

app.use(express.json())

app.get('/info', (req,res,next) => {
    const repos = db.pragma('table_info(repos)')
    res.send({schema:{repos},repos:{types:REPO_TYPES}})
})

const repoInsert = params => db.prepare('insert into repos (name, url, type) values (:name,:url,:type) on conflict(name) do update set url = :url, type = :type').run(params)
app.post('/repo',(req,res,next) => {
    if(!req.body.name){
        return next(new Error('missing name in request body'))
    }
    let r = repoInsert(req.body)
    if(req.body.type == 'pip'){
        r = repoInsert({name:req.body.name+PYTHON_HOSTED.suffix,url:PYTHON_HOSTED.url,type:'python-hosted'})
    }
    res.send(r)
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
    walk(path.join(repopath,req.params.name), file => files.push({filename:file,reponame:req.params.name,md5:md5Hash.sync(file)}))
    db.transaction(data => data.forEach(d => addFile.run(d)))(files)
    logger.info(`rebuilt ${files.length} files in repo ${req.params.name}`)
    res.send({count:files.length})
})

app.listen(args.port, () => logger.info(`main server started on: ${args.port}`))

const docker = express()
docker.use('/', checkCache, modCache)
docker.listen(args.port+1, () => logger.info(`docker server started on: ${args.port+1}`))

exitHook(() => {
    db.close()
    logger.info('\nbye')
})