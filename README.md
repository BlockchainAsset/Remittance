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

`git clone https://github.com/remedcu/RemitChain.git`

2. For this and some other step, you need to have Truffle & other modules installed in your system. Enter the Remittance folder and please run:

`npm install` OR `npm i`

3. Now start the server using:

`npm run-script build && npm start`

4. Now, in your browser, open [http://127.0.0.1:8080](http://127.0.0.1:8080) or the address shown to you in your console.

**NOTE**: If you are using `ganache-cli` for blockchain, please disable MetaMask for checking this project in browser.

## How to Test the Contract

1. Please follow the step 1 - 2 of *How to Run the Project*.

2. Now start the test using:

`npm test`

## Note

- This is a prototype, please don't use it unless you know what you are doing.
- A lot can be improved in this. Feedbacks are welcome.
- Don't forget to unlock ether wallet accounts when required.

## Thank You for checking out! Star if this helped you in anyway!