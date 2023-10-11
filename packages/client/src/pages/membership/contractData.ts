export const contractData = {
    address: '0x04BFd2960bCe936b4318CE3a72250f2147a71eE6',
    block: 9844026,
    chainID: 5,
    minimalDeposit: "5000000000000000"
} as const

export const WETH_ABI = [
    // ... (get the full ABI from Etherscan or another source)
    "function deposit() external payable",
    "function balanceOf(address owner) view returns (uint)"
] as const

export const WETH_ADDRESS = '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6' as const // This is for Ethereum mainnet