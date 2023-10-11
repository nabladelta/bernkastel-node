import { RLN, ContractProvider, RLNContract } from "@nabladelta/rln"
import { ethers } from "ethers"
import { BBNode } from "@nabladelta/bernkastel"
import { getDefaultWithdrawParams } from 'rlnjs'
import { DATA_FOLDER, GROUPID, GROUP_FILE, SECRET, TOPICS, PRIVATE_KEY, CONTRACT_ADDRESS, BLOCKCHAIN_RPC, BLOCKCHAIN_RPC_WS, CONTRACT_AT_BLOCK } from './constants'

export async function nodeSetup(logger: any) {
    const rln = await RLN.load(SECRET!, GROUP_FILE)
    const node = new BBNode(SECRET!, GROUPID, rln, {memstore: true, logger, dataFolder: DATA_FOLDER})
    await node.ready()
    await node.join(TOPICS!.split(','))
    return { node }
}

export async function contractSetup(logger: any) {
    const provider = BLOCKCHAIN_RPC_WS ? new ethers.WebSocketProvider(BLOCKCHAIN_RPC_WS) : new ethers.JsonRpcProvider(BLOCKCHAIN_RPC)
    const wallet = new ethers.Wallet(PRIVATE_KEY!, provider)
    const withdrawParams = await getDefaultWithdrawParams()
    const rlnProvider = await ContractProvider.load(
        CONTRACT_ADDRESS, provider, wallet, 
        CONTRACT_AT_BLOCK, wallet.address,
        GROUPID, 20,
        {withdrawFinalZkeyPath: withdrawParams.finalZkey, withdrawWasmFilePath: withdrawParams.wasmFile})

    const secret = await ContractProvider.secretFromSigner(wallet, CONTRACT_ADDRESS)
    const rln = await RLN.loadCustom(secret, rlnProvider)
    const node = new BBNode(secret, GROUPID, rln, {memstore: false, logger, dataFolder: DATA_FOLDER})
    await node.ready()
    await node.join(TOPICS!.split(','))
    return { node }
}