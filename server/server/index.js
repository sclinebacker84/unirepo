import axios from 'axios'
import express from 'express'
import ViteExpress from 'vite-express'
import fs from 'fs-extra'
import path from 'path'
import winston from 'winston'
import serveIndex from 'serve-index'
import nunjucks from 'nunjucks'

/** constants */

const __dirname = process.cwd()

const REPOS = fs.readJSONSync(path.join(__dirname,'repos.json'))
const PORT = parseInt(process.env.PORT)
const DOCKER_PORT = PORT + 1
const LOGLEVEL = process.env.LOGLEVEL || 'info'
const HOST = process.env.HOST || 'localhost'
const DOCKER_HEADER_SUFFIX = '_headers'

const logger = winston.createLogger({
    transports:[new winston.transports.Console()],
    format:winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(info => `[${info.level}] ${info.timestamp}: ${info.message}`)
    ),
    level:LOGLEVEL
})

const RE = {
    BASE_REPO_URL:/^\/repos\/.*?\//,
    PIP_FIX_URL:/.*?\/packages/,
    TRAILING_SLASH:/\/$/
}

const PATHS = {
    repos:'/repos',
    files:'/files'
}

const app = express()

/** functions */

//make an axios request as a proxy for the express request coming in
const proxyReq = async (req,res,url,extraHeaders) => {
    const opts = {
        url:url.href,
        method:req.method,
        responseType:'stream',
        headers:Object.assign(req.headers,{host:url.host})
    }
    if(extraHeaders){
        Object.assign(opts.headers,extraHeaders)
    }
    try{
        const axiosRes = await axios(opts)
        res.set(axiosRes.headers)
        res.status(axiosRes.status)
        return axiosRes
    }catch(err){
        logger.error(`${url}, ${err}`)
        throw err
    }
}

//get the index of the dash in a split url list
const dashIndex = key => {
    if(!Array.isArray(key)){
        key = key.split('/')
    }
    return key.findIndex(k => k == '-')
}

//get the cache file path for a request and url
const getCacheKey = (req,url) => {
    let key = path.join(PATHS.repos,req.params.name,url.pathname)
    switch(req.params.name){
        case 'npm': //account for npm's way of organizing their endpoints in a non-posix compliant way
            key = key.split('/')
            const i = dashIndex(key)
            const s = 3
            if(i > -1){
                key.splice(s,(i-s))
            }
            key = key.join('/')
            break
        case 'pip':
            if(key.match(RE.TRAILING_SLASH)){
                key += 'index.json'
            }
            break
    }
    return key
}

//write a file to cache key path
const writeFile = async (key,url,data) => {
    fs.mkdirpSync(path.dirname(key))
    const ws = fs.createWriteStream(key)
    data.pipe(ws)
    return new Promise(resolve => ws.on('finish',() => {
        logger.debug(`wrote file to: ${key} for url: ${url.href}`)
        resolve()
    }))
}

//actions to take after writing a file to cache
const postWrite = async (req,axiosRes,key,url) => {
    switch(req.params.name){
        case "pip":
            if(url.href.endsWith('/')){ //index.html file, replace host
                const repo = REPOS.find(r => r.name == "pip")
                fs.writeFileSync(key,fs.readFileSync(key,'utf-8').replaceAll(repo.packages,'repos/pip/'))
            }
            break
        case 'docker':
            if(isDockerManifest(key)){
                logger.debug(`determined ${key} is a docker manifest, writing headers`)
                fs.writeJSONSync(key+DOCKER_HEADER_SUFFIX,axiosRes.headers)
            }
            break
    }
}

//actions to take before sending out the requested file
const preSendFile = async (req, res, key, fileExists) => {
    const options = {root:'/'}
    switch(req.params.name){
        case "pip":
            if(fileExists){
                if(key.endsWith('.json')){
                    options.headers = {'content-type':'application/vnd.pypi.simple.v1+json'}
                }
            }
            break
        case 'docker':
            if(fileExists){
                if(isDockerManifest(key)){
                    logger.debug(`determined ${key} is a docker manifest, reading headers`)
                    res.set(fs.readJSONSync(key+DOCKER_HEADER_SUFFIX))
                }
            }
    }
    return options
}

//generate a url
const getUrl = (req) => {
    const repo = REPOS.find(r => r.name == req.params.name)
    let host = repo.link
    let pathname = req.url.replace(RE.BASE_REPO_URL,'')
    switch(req.params.name){
        case "pip":
            if(req.url.includes('packages/')){
                host = repo.packages
                pathname = pathname.replace(RE.PIP_FIX_URL,'packages')
            }
            break
        case "rocky":
            if(req.url.includes('epel/')){
                host = repo.epel
                pathname = pathname.replace('epel/','')
            }
            break
        case "docker":
            const registry = repo.registries.find(r => req.path.includes(r))
            if(registry){
                host = 'https://'+registry
                pathname = pathname.replace(registry+'/','')
            }
            break
    }
    return new URL(pathname, host)
}

//the main handler for incoming proxy requests that checks and updates the cache
const handleReq = async (req,res,next,handleErr) => {
    const url = getUrl(req)
    const key = getCacheKey(req,url)
    const fileExists = fs.pathExistsSync(key) && fs.statSync(key).isFile()
    let axiosRes = undefined
    if(!fileExists){
        try{
            axiosRes = await proxyReq(req,res,url)
        }catch(err){
            if(handleErr){
                axiosRes = await handleErr(err,req,res,url)
            }else{
                logger.error(`problem getting data from url: ${url.href}`)
                return next(err)
            }
        }
        try{
            await writeFile(key,url,axiosRes.data)
            await postWrite(req,axiosRes,key,url)
        }catch(err){
            logger.error(`problem writing file: ${key} for url ${url.href}`)
            return next(err)
        }
    }else{
        logger.debug(`found file in cache: ${key} for url ${url.href}`)
    }
    res.sendFile(key,(await preSendFile(req,res,key,fileExists)))
}

/** endpoints */

app.get('/info',(_,res) => {
    res.send({
        git:{
            timestamp:process.env.GIT_TIMESTAMP,
            hash:process.env.GIT_HASH
        }
    })
})

app.get(`/repos`,(_,res) => {
    res.send(REPOS)
})

app.get(`/repos/config/:name`,(req,res) => {
    res.send(nunjucks.render(
        path.join(__dirname,'template',`${req.params.name}.template`),
        {HOST,PORT,DOCKER_PORT}
    ))
})

app.get(`/repos/:name/*`, async (req,res,next) => handleReq(req,res,next))

for(const path in PATHS){
    app.use('/browse/'+path,serveIndex(PATHS[path],{icons:true,view:'details'}))
}

ViteExpress.listen(app, PORT)

/** docker endpoints & functions */

//return an auth token for the given scope & service
const dockerRefresh = ({scope,service}) => {
    logger.debug(`getting auth token for: ${service} -- ${scope}`)
    return axios.get('https://auth.docker.io/token',{params:{scope,service}})
}

//get the bearer token from a 401 response
const parseBearerToken = (res) => {
    return res.headers['www-authenticate'].replace('Bearer ','').split(',').reduce((a,c) => {
        c = c.split('=')
        a[c[0]] = c[1].replaceAll('"','')
        return a
    },{})
}

//check if the requested file is a docker manifest
const isDockerManifest = (key) => {
    return key.includes('/manifests/')
}

const dockerServer = express()

dockerServer.get('/*',async (req,res,next) => {
    if(req.url.endsWith('/v2/')){
        logger.debug('skipping dummy docker request')
        return res.sendStatus(200)
    }
    req.params.name = 'docker'
    handleReq(req,res,next,async (err,req,res,url) => {
        if(err.response.status == 401){
            const token = (await dockerRefresh(parseBearerToken(err.response))).data.token
            const axiosRes = await proxyReq(req,res,url,{'Authorization':'Bearer '+token})
            return axiosRes
        }
    })
})

dockerServer.listen(DOCKER_PORT, () => logger.info(`started docker server on port: ${DOCKER_PORT}`))