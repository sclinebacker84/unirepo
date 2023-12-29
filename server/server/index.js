import axios from 'axios'
import express from 'express'
import ViteExpress from 'vite-express'
import fs from 'fs-extra'
import path from 'path'
import os from 'os'
import winston from 'winston'
import serveIndex from 'serve-index'
import envsub from 'envsub'

/** constants */

const __dirname = process.cwd()

const PORT = parseInt(process.env.PORT)
const LOGLEVEL = process.env.LOGLEVEL || 'info'

const RE = {
    BASE_REPO_URL:/^\/repos\/.*?\//
}

const PATHS = {
    repos:'/repos',
    files:'/files'
}

const REPOS = fs.readJSONSync(path.join(__dirname,'repos.json'))

const PYTHON_HOSTED = {
    url:'https://files.pythonhosted.org',
    packages:'/files'
}

const DOCKER = {
    url: 'https://registry-1.docker.io',
    registries:['mcr.microsoft.com'],
    service:'registry.docker.io',
    reponame:'docker',
    api:'/v2/',
    host:`${os.hostname()}:${PORT+1}`,
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

const logger = winston.createLogger({
    transports:[new winston.transports.Console()],
    format:winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(info => `[${info.level}] ${info.timestamp}: ${info.message}`)
    ),
    level:LOGLEVEL
})

const app = express()

/** functions */

//make an axios request as a proxy for the express request coming in
const proxyReq = (req,url) => {
    return axios({
        url:url.href,
        method:req.method,
        responseType:'stream',
        headers:Object.assign(req.headers,{host:url.host})
    }).catch(err => {
        logger.error(`${url}, ${err}`)
        return err
    })
}

//get the cache file path for a request and url
const getCacheKey = (req,url) => path.join(PATHS.repos,req.params.name,url.pathname)

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

/** endpoints */

app.get('/repos',(_,res) => {
    res.send(REPOS)
})

app.get('/repos/config/:name',(req,res) => {
    res.sendFile(path.join(__dirname,'template',`${req.params.name}-default.repo.template`))
})

app.get('/repos/:name/*',async (req,res) => {
    const url = new URL(req.url.replace(RE.BASE_REPO_URL,''), REPOS.find(r => r.name == req.params.name).link)
    const key = getCacheKey(req,url)
    const fileExists = fs.pathExistsSync(key) && fs.statSync(key).isFile()
    if(!fileExists){
        const axiosRes = await proxyReq(req,url)
        res.set(axiosRes.headers)
        res.status(axiosRes.status)
        await writeFile(key,url,axiosRes.data)
    }else{
        logger.debug(`found file in cache: ${key} for url ${url.href}`)
    }
    res.sendFile(key)
})

ViteExpress.listen(app, PORT)