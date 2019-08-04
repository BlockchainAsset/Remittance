const Web3 = require('web3');
const $ = require('jquery');
const assert = require('assert');

require('file-loader?name=../index.html!../index.html');

const truffleContract = require('truffle-contract');
const remittanceJson = require('../../build/contracts/Remittance.json');

if (typeof web3 !== 'undefined') {
    // Use the Mist/wallet/Metamask provider.
    web3 = new Web3(web3.currentProvider);
} else {
    // Fallback.
    web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545')); 
}

const Remittance = truffleContract(remittanceJson);
Remittance.setProvider(web3.currentProvider);