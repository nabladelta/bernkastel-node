import express, { Express, Request, Response } from 'express'
import cors from 'cors'
import { fileExists, makeThumbnail, parseFileID, processAttachment } from './lib'
import path from 'path'
import fs from 'fs'
import { DATA_FOLDER, PORT, REQ_SIZE_LIMIT, THUMB_FORMAT, TOPICS } from './constants'
import { mainLogger } from './core/logger'
import { nodeSetup } from './setup'
import { BBNode } from '@bernkastel/core'
import { Filestore } from './core/filestore'

const log = mainLogger.getSubLogger({name: 'HTTP'})

let node: BBNode
let filestore: Filestore
nodeSetup(mainLogger).then(n => {node = n.node; filestore = n.filestore})

const app: Express = express()

app.use(express.json({limit: REQ_SIZE_LIMIT}))
app.use(cors())

function NotFoundError(res: express.Response) {
  res.status(404)
  res.send({error: "Not Found"})
}

function FailedPost(res: express.Response) {
  log.warn("Failed post")
  res.status(400)
  res.send({error: "Failed to post"})
}

function FailedException(res: express.Response, message: string) {
  log.warn(message)
  res.status(400)
  res.send({error: message})
}

app.get('/api/:topic/thread/:id\.:ext?', async (req: Request, res: Response) => {
    const client = node.getTopic(req.params.topic)
    if (!client) return NotFoundError(res)

    const thread = await client.getThreadContent(req.params.id)
    if (!thread) return NotFoundError(res)
    res.send(thread)
})

app.get('/api/:topic/catalog\.:ext?', async (req: Request, res: Response) => {
  const client = node.getTopic(req.params.topic)
  if (!client) return NotFoundError(res)

  const catalog = await client.getCatalog()
  res.send(catalog)
})

app.get('/api/boards\.:ext?', async (req: Request, res: Response) => {
  const r: IBoardList = {boards: []}
  for (let topic of TOPICS.split(',')) {
    r.boards.push({board: topic, pages: 16, per_page: 16})
  }
  res.send(r)
})

app.get('/api/file/:id\.:ext?', async (req: Request, res: Response) => {
  const id = parseFileID(req.params.id)
  const content = await filestore.retrieve(id.cid, id.blobId)

  if (!content) return NotFoundError(res)

  if (content.mime && content.mime.length > 0) {
    res.contentType(content.mime)
  } else { // Fall back to extension in url if mime type is not set
    if (req.params.ext) res.contentType(req.params.ext)
    else res.contentType("application/octet-stream")
  }
  res.send(content.data)
})

app.get(`/api/thumb/:id\.:ext?`, async (req: Request, res: Response) => {
  const dir = path.join(DATA_FOLDER, 'thumbs')

  if (!await fileExists(dir)) {
    fs.mkdirSync(dir, {recursive: true})
  }

  const filename = path.join(dir, `${req.params.id}.${THUMB_FORMAT}`)

  if (!await fileExists(filename)) {
    const result = await makeThumbnail(filestore, req.params.id, filename)
    if (!result) return NotFoundError(res)

    log.info(`Generated ${THUMB_FORMAT} thumbnail for ${req.params.id}`)
  }
  
  res.contentType(THUMB_FORMAT)

  const options = {
    root: dir,
    dotfiles: 'deny',
    headers: {}
  }
  
  res.sendFile(`${req.params.id}.${THUMB_FORMAT}`, options, (e) => {
    if (e) log.warn(e)
  })
})

app.post('/api/:topic/thread/:id\.:ext?', async (req: Request, res: Response) => {
    const client = node.getTopic(req.params.topic)
    if (!client) return NotFoundError(res)
    const post: IPost = req.body.post
    try {
      if (req.body.attachments && req.body.attachments[0]) {
        await processAttachment(filestore, req.body.attachments[0], post, req.params.id)
      }
      const core = await client.newPost(post)
  
      if (!core) return FailedPost(res)
  
      const thread = await client.getThreadContent(req.params.id)
      res.send({success: true, posts: thread!.posts})

    } catch (e) {
      FailedException(res, (e as Error).message)
    }
})

app.post('/api/:topic', async (req: Request, res: Response) => {
  const client = node.getTopic(req.params.topic)
  if (!client) return NotFoundError(res)
  const post: IPost = req.body.post
  try {
    const threadId = await client.newThread(post)
    await processAttachment(filestore, req.body.attachments[0], post, threadId)
    if (!threadId) return FailedPost(res)
    const thread = await client.getThreadContent(threadId)
    res.send({success: true, op: threadId, thread: thread})

  } catch (e) {
    FailedException(res, (e as Error).message)
  }
})
app.use(express.static(path.join(__dirname, '../../client/build')))
app.get('(/*)?', function (req, res) {
   res.sendFile(path.join(__dirname, '../../client/build', 'index.html'));
 })

app.listen(PORT, () => {
  log.info(`⚡️API is running at http://localhost:${PORT}`)
})