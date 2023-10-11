# Bernkastel Node
Node application for the Bernkastel P2P Decentralized BBS based on RLN

## Getting started
First, clone the repository to your system and install dependencies with NPM
```
$ git clone https://github.com/nabladelta/bernkastel-node.git
$ cd ./bernkastel-node
$ npm install
```
Move to the web client directory, build it, and then run it with `serve` for now:
```
$ cd ./packages/client
$ npm run build
$ npx serve -s ./build
```
### Registration
Next, you need to register a membership in the RLN Group through the smart contract.
This requires a 0.005 ETH fully refundable deposit, but the contract is currently on the Goerli testnet, so you can get the Goerli ETH for free from a faucet like: https://goerlifaucet.com/
Make sure you have at least about 0.01 Goerli ETH on your address before proceeding.
Now, using a browser with your Metamask wallet installed, navigate to the `/setup` page on the web client.
Click on Connect Metamask to connect your wallet.
You can leave the multiplier as it is. Click on the registration button, and execute every transaction it prompts you to. It takes a while so be patient.
Now you have a membership into the RLN Group and have gained the right to run a Bernkastel node, until you decide to withdraw your deposit.

Make sure to never use the same account on different devices or otherwise run more than one node with the same account, as it will result in permanent loss of your deposit, and being banned from the group automatically.

Use Metamask to find the private key associated with the address you registered, and copy it for later, this is needed to set up your node.

### Node Setup
Shut down the instance of `serve` you started earlier.
Make sure you are in `/packages/node` within the repository:
```
$ cd ../node
```
Copy the `.env.example` file to `.env`:
```
$ cp .env.example .env
```
Now you need to modify the values in the .env file in order to set up your node.
The most important values are `PRIVATE_KEY` which should be your private key from Metamask, it must correspond to the address you registered in the previous step, and `BLOCKCHAIN_RPC` which should be an RPC URL for the Goerli Testnet.
You can get an RPC address for yourself from Alchemy (https://www.alchemy.com/) by making an account and creating a new project, then selecting Ethereum and Goerli.

Also make sure to set TOPIC to a comma separated list of topics (boards) you are interested in your node connecting to.

Finally, make sure you are still in the `node` directory, and then start it with

```
$ npm run start
```
