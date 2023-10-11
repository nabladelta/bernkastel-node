import React, {useEffect, useState} from 'react'
import {
  VStack,
  Link as CLink,
  HStack,
  IconButton,
  Tooltip,
  Wrap,
  Button,
  Input,
  FormControl,
  FormLabel,
  InputGroup,
  InputRightAddon,
  FormErrorMessage
} from "@chakra-ui/react"
import { ArrowBackIcon, ArrowDownIcon, ArrowUpIcon, CopyIcon } from '@chakra-ui/icons'
import { Link } from 'react-router-dom'
import { useToast } from '@chakra-ui/react'
import { RLNContract } from '@nabladelta/rln'
import { User, Withdrawal, calculateNecessaryWETHBalance, connectMetaMask, getSecret, registerRLNMembership, releaseRLNWithdrawal, withdrawRLNMembership } from './ethUtils'
import { contractData } from './contractData'
import { ethers } from 'ethers'
import { poseidon1 } from 'poseidon-lite'

export const buttonStyle = { variant:'outline', colorScheme:'gray', fontSize:'20px' }


function MembershipSetup() {
  const toast = useToast()

  const [rlnContract, setRlnContract] = useState<RLNContract | null>(null)
  const [secret, setSecret] = useState<bigint|null>(null)
  const [membership, setMembership] = useState<User|null>(null)
  const [withdrawal, setWithdrawal] = useState<Withdrawal|null>(null)

  const [error, setError] = useState<string | null>(null)
  const [multiplier, setMultiplier] = useState<string>("1")
  const [price, setPrice] = useState<string>(ethers.formatEther(calculateNecessaryWETHBalance(1)) + " ETH")
  const handleIntegerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMultiplier(e.target.value);
    if (parseInt(e.target.value) < 1 || parseInt(e.target.value) > 1000 || !Number.isInteger(parseInt(e.target.value))) {
      setError("Please enter an integer between 1 and 1000.");
    } else {
      setError(null)
      const necessaryEth = calculateNecessaryWETHBalance(parseInt(e.target.value))
      setPrice(ethers.formatEther(necessaryEth)+ " ETH")
    }
  }

  useEffect(() => {
    document.title = `RLN Membership Subscription`
  }, [])

  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleCopyClick = () => {
    if (inputRef.current) {
      inputRef.current.select();
      document.execCommand("copy");
      toast({
        title: "Copied",
        description: "Secret copied to clipboard.",
        status: "success",
        duration: 5000,
        isClosable: true,
      })
    }
  };


  async function loadContract() {
    const provider = await connectMetaMask(toast)
    if (!provider) {
        return
    }

    const signer = await provider.getSigner()
    const contract = new RLNContract({
        provider: signer.provider, signer: signer,
        contractAddress: contractData.address,
        contractAtBlock: contractData.block
    })
    let s: bigint | undefined = undefined
    if (!secret) {
        try {
            s = await getSecret(signer, contractData.address)
            setSecret(s)
        } catch (e) {
            console.error(e)
            alert("Error getting secret.")
            return
        }
    }
    if (!s) return

    const identityCommitment = poseidon1([s])
    const user = await contract.getUser(identityCommitment)
    if (user.messageLimit > 0) {
      console.log(user)
      setMembership(user)
      setPrice(ethers.formatEther(calculateNecessaryWETHBalance(parseInt(user.messageLimit.toString()))) + " ETH")
    }
    const withdrawal = await contract.getWithdrawal(identityCommitment)
    if (withdrawal.amount > 0) {
      console.log(withdrawal)
      setWithdrawal(withdrawal)
    }

    setRlnContract(contract)
    toast({
      title: "Contract Loaded",
      description: "Contract loaded successfully.",
      status: "success",
      duration: 5000,
      isClosable: true,
    })
  }

  async function registerMembership() {
    if (!rlnContract || !secret) {
        return
    }
    try {
        await registerRLNMembership(secret, 1, rlnContract)
        toast({
            title: "Group Membership Registered",
            description: "Secret added to RLN group",
            status: "success",
            duration: 5000,
            isClosable: true,
        })
        // Refresh the page to update the membership
        window.location.reload()
    } catch (e) {
        console.error(e)
        toast({
            title: "Registration error",
            description: `${e}`,
            status: "error",
            duration: 5000,
            isClosable: true,
        })
    }
  }
  async function withdrawMembership() {
    if (!rlnContract || !secret || !membership) {
      return
  }
  try {
      await withdrawRLNMembership(rlnContract, secret, membership.userAddress)
      toast({
          title: "Withdrawal Started",
          description: `This is a two step process. Please wait for ${contractData.freezePeriod} blocks to complete the withdrawal.`,
          status: "success",
          duration: 5000,
          isClosable: true,
      })
  } catch (e) {
      console.error(e)
      toast({
          title: "Withdrawal error",
          description: `${e}`,
          status: "error",
          duration: 5000,
          isClosable: true,
      })
  }
  }

  async function releaseWithdrawal() {
    if (!rlnContract || !secret || !withdrawal) {
      return
    }
    const provider = rlnContract["provider"]
    const blockn = await provider.getBlockNumber()
    const releaseBlock = parseInt(withdrawal.blockNumber.toString()) + contractData.freezePeriod
    if (blockn < releaseBlock) {
      toast({
          title: "Withdrawal error",
          description: `Please wait for ${releaseBlock - blockn} more blocks to release your withdrawal.`,
          status: "error",
          duration: 5000,
          isClosable: true,
      })
      return
    }
  try {
      await releaseRLNWithdrawal(rlnContract, secret)
      toast({
          title: "Withdrawal Released",
          description: "You are receiving your funds",
          status: "success",
          duration: 5000,
          isClosable: true,
      })
  } catch (e) {
      console.error(e)
      toast({
          title: "Withdrawal error",
          description: `${e}`,
          status: "error",
          duration: 5000,
          isClosable: true,
      })
  }
  }


  return (
    <VStack align="flex-start" spacing={8}>
    <HStack id={'top'} spacing={6}>
      <Tooltip label='Return'>
        <Link to="/" ><IconButton aria-label='Return' icon={<ArrowBackIcon />} {...buttonStyle}/></Link>
      </Tooltip>
      <Tooltip label='Bottom'>
        <CLink href="#bottom" _hover={{ textDecoration: "none" }}>
          <IconButton aria-label='Bottom' icon={<ArrowDownIcon />} {...buttonStyle} />
        </CLink>
      </Tooltip>
    </HStack>
    <Wrap spacing='40px' >
    {(!rlnContract || !secret) && <Button onClick={loadContract} {...buttonStyle}>Connect Metamask</Button>}
    {rlnContract && !membership && <>
        <FormControl>
        <FormLabel htmlFor="disabledInput">Your Secret</FormLabel>
        <InputGroup>
            <Input ref={inputRef} value={secret?.toString(16)} isReadOnly={true} />
            <InputRightAddon>
            <IconButton aria-label='Copy Secret' onClick={handleCopyClick} {...buttonStyle} icon={<CopyIcon />} />
            </InputRightAddon>
        </InputGroup>
        </FormControl>
        <FormControl isInvalid={!!error}>
          <FormLabel htmlFor="integerInput">Enter your messageLimit multiplier (1-1000):</FormLabel>
          <Input
            id="integerInput"
            value={multiplier}
            onChange={handleIntegerChange}
            type="number"
            min="1"
            max="1000"
          />
          <FormErrorMessage>{error}</FormErrorMessage>
        </FormControl>
        <FormControl>
        <FormLabel htmlFor="disabledInput">Registration price</FormLabel>
        <InputGroup>
            <Input value={price} isReadOnly={true} />
        </InputGroup>
        </FormControl>
        <Button onClick={async () => {await registerMembership()}} {...buttonStyle}>Register Into RLN Group</Button>
    </>}

    {rlnContract && membership && !withdrawal && <>
        <FormControl>
        <FormLabel htmlFor="disabledInput">Your Secret</FormLabel>
        <InputGroup>
            <Input ref={inputRef} value={secret?.toString(16)} isReadOnly={true} />
            <InputRightAddon>
            <IconButton aria-label='Copy Secret' onClick={handleCopyClick} {...buttonStyle} icon={<CopyIcon />} />
            </InputRightAddon>
        </InputGroup>
        </FormControl>
        
        <FormControl>
        <FormLabel htmlFor="disabledInput">Your Message Limit</FormLabel>
        <InputGroup>
            <Input value={membership.messageLimit.toString()} isReadOnly={true} />
        </InputGroup>
        </FormControl>
        <FormControl>
        <FormLabel htmlFor="disabledInput">Your Deposited Amount</FormLabel>
        <InputGroup>
            <Input value={price} isReadOnly={true} />
        </InputGroup>
        </FormControl>
        <Button onClick={async () => { await withdrawMembership()}} {...buttonStyle}>Withdraw from RLN Group</Button>
    </>}
    {rlnContract && withdrawal && <>
        <FormControl>
        <FormLabel htmlFor="disabledInput">Your Secret</FormLabel>
        <InputGroup>
            <Input ref={inputRef} value={secret?.toString(16)} isReadOnly={true} />
            <InputRightAddon>
            <IconButton aria-label='Copy Secret' onClick={handleCopyClick} {...buttonStyle} icon={<CopyIcon />} />
            </InputRightAddon>
        </InputGroup>
        </FormControl>
        <FormControl>
        <FormLabel htmlFor="disabledInput">Pending withdrawal will be available for release at block:</FormLabel>
        <InputGroup>
            <Input value={parseInt(withdrawal.blockNumber.toString()) + contractData.freezePeriod} isReadOnly={true} />
        </InputGroup>
        </FormControl>
        <FormControl>
        <FormLabel htmlFor="disabledInput">Your Withdrawal Amount</FormLabel>
        <InputGroup>
            <Input value={ethers.formatEther(withdrawal.amount)} isReadOnly={true} />
        </InputGroup>
        </FormControl>
        <Button onClick={async () => { await releaseWithdrawal()}} {...buttonStyle}>Attempt to release withdrawal</Button>
    </>}
    </Wrap>
    <HStack id={'bottom'} spacing={6}>
      <Tooltip label='Return'>
        <Link to="/" ><IconButton aria-label='Return' icon={<ArrowBackIcon />} {...buttonStyle}/></Link>
      </Tooltip>
      <Tooltip label='Top'>
        <CLink href="#top" _hover={{ textDecoration: "none" }}>
          <IconButton aria-label='Top' icon={<ArrowUpIcon />} {...buttonStyle} />
        </CLink>
      </Tooltip>
    </HStack>
    </VStack>
  );
}

export default MembershipSetup;
