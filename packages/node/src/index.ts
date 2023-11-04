import express, { Express, Request, Response } from 'express'
import cors from 'cors'
import { decodeMime, fileExists, makeThumbnail, processAttachment } from './lib.js'
import path from 'path'
import fs from 'fs'
import { DATA_FOLDER, PORT, REQ_SIZE_LIMIT, THUMB_FORMAT, TOPICS } from './constants.js'
import { mainLogger } from './logger.js'
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { contractSetup } from './setup.js'

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { Bernkastel } from '@nabladelta/bernkastel'

const log = mainLogger.getSubLogger({name: 'HTTP'})

const topics = new Map<string, Bernkastel>()

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
    const client = topics.get(req.params.topic)
    if (!client) return NotFoundError(res)

    const thread = await client.getThreadContent(req.params.id)
    if (!thread) return NotFoundError(res)
    res.send(thread)
})

app.get('/api/:topic/catalog\.:ext?', async (req: Request, res: Response) => {
  const client = topics.get(req.params.topic)
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

app.get('/api/file/:topic/:id\.:ext?', async (req: Request, res: Response) => {
  const topic = req.params.topic
  const attachmentHash = req.params.id

  const client = topics.get(topic)
  if (!client) return NotFoundError(res)
  const content = await client.getAttachment(attachmentHash)
  if (!content) return NotFoundError(res)
  const {mime, data} = decodeMime(content)
  if (mime && mime.length > 0) {
    res.contentType(mime)
  } else { // Fall back to extension in url if mime type is not set
    if (req.params.ext) res.contentType(req.params.ext)
    else res.contentType("application/octet-stream")
  }
  res.send(data)
})

app.get(`/api/thumb/:topic/:id\.:ext?`, async (req: Request, res: Response) => {
  const dir = path.join(DATA_FOLDER, 'thumbs')

  if (!await fileExists(dir)) {
    fs.mkdirSync(dir, {recursive: true})
  }

  const filename = path.join(dir, `${req.params.id}.${THUMB_FORMAT}`)

  if (!await fileExists(filename)) {
    const topic = req.params.topic
    const attachmentHash = req.params.id
    const client = topics.get(topic)
    if (!client) return NotFoundError(res)
    const content = await client.getAttachment(attachmentHash)
    if (!content) return NotFoundError(res)
    const { data } = decodeMime(content)
    const result = await makeThumbnail(data, filename)
    if (!result) return NotFoundError(res)

    log.info(`Generated ${THUMB_FORMAT} thumbnail for ${req.params.id}`)
  }
  
  res.contentType(THUMB_FORMAT)

  const options = {
    root: dir,
    dotfiles: "deny" as const,
    headers: {}
  }
  
  res.sendFile(`${req.params.id}.${THUMB_FORMAT}`, options, (e) => {
    if (e) log.warn(e)
  })
})

app.post('/api/:topic/thread/:id\.:ext?', async (req: Request, res: Response) => {
    const client = topics.get(req.params.topic)
    if (!client) return NotFoundError(res)
    const post: IPost = req.body.post
    try {
      let attachment: Uint8Array | undefined
      if (req.body.attachments && req.body.attachments[0]) {
        const res = await processAttachment(req.body.attachments[0], post, req.params.topic)
        attachment = res.attachment
      }
      const core = await client.newPost(post, attachment)
  
      if (!core) return FailedPost(res)
  
      const thread = await client.getThreadContent(req.params.id)
      res.send({success: true, posts: thread!.posts})

    } catch (e) {
      FailedException(res, (e as Error).message)
    }
})

app.post('/api/:topic', async (req: Request, res: Response) => {
  const client = topics.get(req.params.topic)
  if (!client) return NotFoundError(res)
  const post: IPost = req.body.post
  try {
    let attachment: Uint8Array | undefined
    if (req.body.attachments && req.body.attachments[0]) {
      const res = await processAttachment(req.body.attachments[0], post, req.params.topic)
      attachment = res.attachment
    }
    const { result, eventID, exists } = await client.newThread(post, attachment)
    if (!result) return FailedPost(res)
    if (!eventID) return FailedPost(res)
    const thread = await client.getThreadContent(eventID)
    res.send({success: true, op: eventID, thread: thread})
  } catch (e) {
    log.error(e)
    FailedException(res, (e as Error).message)
  }
})

app.use(express.static(path.join(__dirname, '../../client/build')))

app.get('(/*)?', function (req, res) {
   res.sendFile(path.join(__dirname, '../../client/build', 'index.html'));
})

contractSetup(mainLogger.getSubLogger({name: 'NODE'})).then(async ({createTopic}) => {
  for (let topic of TOPICS.split(',')) {
    topics.set(topic, await createTopic(topic))
  }
  app.listen(PORT, () => {
    log.info(`⚡️API is running at http://localhost:${PORT}`)
  })
})