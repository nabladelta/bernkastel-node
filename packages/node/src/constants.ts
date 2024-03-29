import dotenv from 'dotenv'
import path from 'path'
import sharp, { FormatEnum } from 'sharp'
dotenv.config()

export const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "0x04BFd2960bCe936b4318CE3a72250f2147a71eE6"
export const CONTRACT_AT_BLOCK = parseInt(process.env.CONTRACT_AT_BLOCK || "9844026")
export const PRIVATE_KEY = process.env.PRIVATE_KEY
export const BLOCKCHAIN_RPC = process.env.BLOCKCHAIN_RPC || "http://localhost:8545"
export const BLOCKCHAIN_RPC_WS = process.env.BLOCKCHAIN_RPC_WS

export const PORT = process.env.PORT || "1832"
export const TOPICS = process.env.TOPICS || "a"
export const SECRET = process.env.SECRET
export const MEMSTORE = process.env.MEMSTORE || "false"
export const THUMB_SIZE = parseInt(process.env.THUMB_SIZE || "300")

export const THUMB_FORMAT = sharp
    .format[process.env.THUMB_FORMAT as keyof FormatEnum]?.output.file ? 
    process.env.THUMB_FORMAT as keyof FormatEnum : "jpeg"

export const REQ_SIZE_LIMIT = process.env.REQ_SIZE_LIMIT || "6mb"
export const FILE_SIZE_LIMIT_UPLOAD = parseInt(process.env.FILE_SIZE_LIMIT_UPLOAD || "5300000")
export const FILE_SIZE_LIMIT_DOWNLOAD = parseInt(process.env.FILE_SIZE_LIMIT_DOWNLOAD || "5400000")
export const FILE_FETCH_TIMEOUT_MS = parseInt(process.env.FILE_FETCH_TIMEOUT_MS || "1500")
export const DATA_FOLDER = process.env.DATA_FOLDER || path.join(process.cwd(), 'data')
export const FUTURE_TOLERANCE_SECONDS = parseInt(process.env.FUTURE_TOLERANCE_SECONDS || "60")
export const UPDATE_STALE_SECONDS = parseInt(process.env.UPDATE_STALE_SECONDS || "120")

const LOGLEVELS: {[name: string]: number | undefined} = {
    'silly': 0, 'trace': 1, 'debug': 2,
    'info': 3, 'warn': 4, 'error': 5,
    'fatal': 6
}

export const LOGLEVEL = LOGLEVELS[(process.env.LOGLEVEL || "INFO").toLowerCase()] || 3
export const GROUP_FILE = process.env.GROUP_FILE || "groupData.json"
export const GROUPID = '1'