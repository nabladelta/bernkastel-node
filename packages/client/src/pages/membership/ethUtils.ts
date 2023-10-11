import { ToastId, UseToastOptions } from "@chakra-ui/react";
import { ethers } from "ethers"
import crypto from "crypto"
import { WETH_ABI, WETH_ADDRESS, contractData } from "./contractData";
import { RLNContract } from '@nabladelta/rln'
import { poseidon1 } from 'poseidon-lite'
import { Proof } from "@nabladelta/rln/src/providers/contractProvider/contractWrapper";
import { WithdrawProver, getDefaultWithdrawParams } from 'rlnjs'

export type User = {
    userAddress: string,
    messageLimit: bigint,
    index: bigint,
}

export type Withdrawal = {
    blockNumber: bigint,
    amount: bigint,
    receiver: string,
}

export async function connectMetaMask(toast: (options?: UseToastOptions | undefined) => ToastId): Promise<ethers.BrowserProvider | undefined> {
    let ethereum = (window as any).ethereum;
    if (typeof ethereum === 'undefined') {
        console.error('MetaMask not found')
        toast({
            title: "MetaMask not found",
            description: "Please install MetaMask to use this dApp.",
            status: "error",
            duration: 5000,
            isClosable: true,
        })
        return
    }
    if (ethereum) {
        try {
            // Request account access
            const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
            console.log("Account", accounts[0])

            const provider = new ethers.BrowserProvider(ethereum)
            if ((await provider.getNetwork()).chainId !== BigInt(contractData.chainID)) {
                alert("Please switch to the Goerli network.")
                throw new Error("Wrong network")
            }
            return provider;  // Returns the current selected address
        } catch (error) {
            console.error('User denied account access')
            toast({
                title: "User denied account access",
                description: "Please authorize this website to use your Ethereum account.",
                status: "error",
                duration: 5000,
                isClosable: true,
            })
        }
    }
}

export async function getSecret(signer: ethers.Signer, contractAddress: string): Promise<bigint> {
    const signedMessage = await signer.signMessage(`Provide membership secret for: ${contractAddress}`)
    const secret = crypto.createHash('sha256').update(signedMessage).digest('hex')
    return BigInt('0x'+secret)
}

async function ensureWETHBalance(desiredBalanceWei: bigint, provider: ethers.Provider, signer: ethers.Signer): Promise<boolean> {

    const WETHContract = new ethers.Contract(WETH_ADDRESS, WETH_ABI, signer)
    // Check WETH balance
    const currentBalance = BigInt((await WETHContract.balanceOf(signer.getAddress())).toString())
    console.log("Current WETH balance:", currentBalance.toString())
    // Check if current balance is less than desired balance
    if (currentBalance < desiredBalanceWei) {
        const differenceWei = desiredBalanceWei - currentBalance

        // Deposit difference
        const tx = await WETHContract.deposit({ value: differenceWei })
        const receipt = await tx.wait()
        if (receipt.status === 0) {
            throw new Error("Transaction failed")
        }
        return true
    } else {
        return false
    }
}

export function calculateNecessaryWETHBalance(multiplier: number): bigint {
    const minimumDeposit = BigInt(contractData.minimalDeposit)
    const necessaryBalance = BigInt(multiplier) * minimumDeposit
    return necessaryBalance
}

export async function registerRLNMembership(secret: bigint, multiplier: number, rlnContract: RLNContract) {
    const necessaryBalance = calculateNecessaryWETHBalance(multiplier)
    const signer = rlnContract["signer"]
    if (!signer) throw new Error("No signer found")
    const balanceChanged = await ensureWETHBalance(necessaryBalance, rlnContract["provider"], signer)
    if (balanceChanged) {
        console.log("Deposited WETH")
    }
    const identityCommitment = poseidon1([secret])
    const tx = await rlnContract.register(identityCommitment, BigInt(1))
    if (tx.status === 0) {
        throw new Error("Transaction failed")
    }
}

export async function withdrawRLNMembership(rlnContract: RLNContract, secret: bigint, withdrawAddress: string) {
    const {wasmFile, finalZkey} = await getDefaultWithdrawParams()
    const prover = new WithdrawProver(wasmFile, finalZkey)
    const proof = await prover.generateProof({identitySecret: secret, address: BigInt(withdrawAddress)})
    console.log("Proof", proof)
    const identityCommitment = poseidon1([secret])
    const tx = await rlnContract.withdraw(identityCommitment, proof.proof)
    if (tx.status === 0) {
        throw new Error("Transaction failed")
    }
}

export async function releaseRLNWithdrawal(rlnContract: RLNContract, secret: bigint) {
    const identityCommitment = poseidon1([secret])
    const tx = await rlnContract.release(identityCommitment)
    if (tx.status === 0) {
        throw new Error("Transaction failed")
    }
}