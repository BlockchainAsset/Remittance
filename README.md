# Remittance
ETH Community Blockstars 2.0's Project 2 - Remittance

## Specification

A smart contract named Remittance whereby:

- there are three people: Alice, Bob & Carol.
- Alice wants to send funds to Bob, but she only has ether & Bob does not care about Ethereum and wants to be paid in local currency.
- luckily, Carol runs an exchange shop that converts ether to local currency.

Therefore, to get the funds to Bob, Alice will allow the funds to be transferred through Carol's exchange shop. Carol will collect the ether from Alice and give the local currency to Bob.

The steps involved in the operation are as follows:

- Alice creates a Remittance contract with Ether in it and a puzzle.
- Alice sends a one-time-password to Bob; over SMS, say.
- Alice sends another one-time-password to Carol; over email, say.
- Bob treks to Carol's shop.
- Bob gives Carol his one-time-password.
- Carol submits both passwords to Alice's remittance contract.
- Only when both passwords are correct does the contract yield the Ether to Carol.
- Carol gives the local currency to Bob.
- Bob leaves.
- Alice is notified that the transaction went through.

Since they each have only half of the puzzle, Bob & Carol need to meet in person so they can supply both passwords to the contract. This is a security measure. It may help to understand this use-case as similar to a 2-factor authentication.

## How to Run the Project

1. First clone this repo

`git clone https://github.com/remedcu/Remittance.git`

2. For this and some other step, you need to have Truffle installed in your system.

After you clone the repo, please make change to _truffle-config.js_ according to which network you require it to run.

For more info on that, you can go to: [Truffle Configuration](https://truffleframework.com/docs/advanced/configuration)

3. Now start your blockchain using:

`ganache-cli --host 0.0.0.0`

If you are running your own blockchain/using test blockchain, please don't forget to unlock your Ether Wallet Account to Deploy this contract in the desired network

4. Then using `truffle migrate` you can deploy the contract.

**NOTE**: *After First Deployment*, If you have made changes to the code or want to create a new contract, please use `truffle migrate --reset`

*If you want to deploy on a particular network*, please use `truffle migrate --network NetworkName --reset`

5. To interact with this contract, you can use `truffle console`

*If you want to interact with the contract in a particular network*, please use `truffle console --network NetworkName`

6. To run the test, please use `truffle test`

Minimum of 3 Accounts *(accounts[0], accounts[1], accounts[2], see test/splitter.js)* should be setup with balances for contract testing. If running `ganache-cli`, it will be taken automatically.

**NOTE**: To run a specific test js file, use `truffle test test/filename.js`

## Yet to be implemented!

7. For checking files in Web, please install the required files using: `npm i`

8. In a terminal,

```
./node_modules/.bin/truffle migrate

./node_modules/.bin/webpack-cli --mode development

npx http-server ./build/app/ -a 0.0.0.0 -p 8000 -c-1
```

9. Now, in your browser, open [http://127.0.0.1:8000](http://127.0.0.1:8000) or the address shown to you in your console.

**NOTE**: If you are using `ganache-cli` for blockchain, please disable MetaMask for checking this project.

## Note

- This is a prototype, please don't use it unless you know what you are doing.
- A lot can be improved in this. Feedbacks are welcome.
- Don't forget to unlock ether wallet accounts when required.

## Thank You for checking out! Star if this helped you in anyway!