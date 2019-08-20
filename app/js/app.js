const Web3 = require('web3');
const $ = require('jquery');
const assert = require('assert');
const { BN, fromWei } = Web3.utils;
const zero = new BN('0');

require('file-loader?name=../index.html!../index.html');

const truffleContract = require('truffle-contract');
const remittanceJson = require('../../build/contracts/Remittance.json');
var port = process.env.PORT || 8545;

console.log(process.env);

if (typeof web3 !== 'undefined') {
    // Use the Mist/wallet/Metamask provider.
    web3 = new Web3(web3.currentProvider);
} else {
    // Fallback.
    web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545')); 
}

const Remittance = truffleContract(remittanceJson);
Remittance.setProvider(web3.currentProvider);

async function updateBalance(remittance) {
    const oWBalance = fromWei(await web3.eth.getBalance(owner));
    const rWBalance = fromWei(await web3.eth.getBalance(remitCreator));
    const eWBalance = fromWei(await web3.eth.getBalance(exchanger));

    $('#oWBalance').html(owner+ '<br>'+ oWBalance.toString(10));
    $('#rWBalance').html(remitCreator+ '<br>'+ rWBalance.toString(10));
    $('#eWBalance').html(exchanger+ '<br>'+ eWBalance.toString(10));

    const oCBalance = fromWei(await remittance.balances(owner));
    const eCBalance = fromWei(await remittance.balances(exchanger));

    $('#oCBalance').html(oCBalance.toString(10));
    $('#eCBalance').html(eCBalance.toString(10));
}

async function remit() {
    try {
        const remittance = await Remittance.deployed();
        const amount = web3.utils.toWei($('input[name="amount"]').val());
        const userPassword = Web3.utils.fromAscii($('input[name="userPassword"]').val());
        const exchangerAddress = $('input[name="exchangerAddress"]').val();
        const seconds = $('input[name="seconds"]').val();
        const hashValue = await remittance.encrypt(
            userPassword,
            exchangerAddress,
            {from: remitCreator}
        );

        $('#remitHashValue').html('Keep it safely: '+hashValue);

        const txObj = await remittance.remit(
            hashValue,
            seconds,
            { from: remitCreator, value: amount }
        ).on(
            'transactionHash',
            txHash => $('#remitStatus').html('Transaction on the way ' + txHash)
        );

        const receipt = txObj.receipt;
        console.log('Got Receipt', receipt);
        if (!receipt.status) {
            console.error('Wrong Status');
            console.error(receipt);
            $('#remitStatus').html('There was an error in the tx execution, status not 1');
        } else if (receipt.logs.length == 0) {
            console.error('Empty logs');
            console.error(receipt);
            $('#remitStatus').html('There was an error in the tx execution, missing expected event');
        } else {
            console.log(receipt.logs[0]);
            $('#remitStatus').html('Transfer executed with Tx Hash: '+receipt.transactionHash);
        }

        updateBalance(remittance);

    } catch (err) {
        $('#remitStatus').html(err.toString());
        console.error(err);
    }
}

async function exchange() {
    try {
        const remittance = await Remittance.deployed();
        const userPassword = Web3.utils.fromAscii($('input[name="userPassword"]').val());

        const txObj = await remittance.exchange(
            userPassword,
            { from: exchanger }
        ).on(
            'transactionHash',
            txHash => $('#exchangeStatus').html('Transaction on the way ' + txHash)
        );

        const receipt = txObj.receipt;
        console.log('Got Receipt', receipt);
        if (!receipt.status) {
            console.error('Wrong Status');
            console.error(receipt);
            $('#exchangeStatus').html('There was an error in the tx execution, status not 1');
        } else if (receipt.logs.length == 0) {
            console.error('Empty logs');
            console.error(receipt);
            $('#exchangeStatus').html('There was an error in the tx execution, missing expected event');
        } else {
            console.log(receipt.logs[0]);
            $('#exchangeStatus').html('Transfer executed with Tx Hash: '+receipt.transactionHash);
        }

        updateBalance(remittance);

    } catch (err) {
        $('#exchangeStatus').html(err.toString());
        console.error(err);
    }
}

async function withdraw() {
    try {
        const remittance = await Remittance.deployed();
        const amount = web3.utils.toWei($('input[name="wAmount"]').val());
        var who = $('input[name="wPerson"]').val();

        if (who == '1'){
            who = owner;
        }
        else{
            who = exchanger;
        }

        const txObj = await remittance.withdraw(
            amount,
            { from: who }
        ).on(
            'transactionHash',
            txHash => $('#withdrawStatus').html('Transaction on the way ' + txHash)
        );

        const receipt = txObj.receipt;
        console.log('Got Receipt', receipt);
        if (!receipt.status) {
            console.error('Wrong Status');
            console.error(receipt);
            $('#withdrawStatus').html('There was an error in the tx execution, status not 1');
        } else if (receipt.logs.length == 0) {
            console.error('Empty logs');
            console.error(receipt);
            $('#withdrawStatus').html('There was an error in the tx execution, missing expected event');
        } else {
            console.log(receipt.logs[0]);
            $('#withdrawStatus').html('Transfer executed with Tx Hash: '+receipt.transactionHash);
        }

        updateBalance(remittance);

    } catch (err) {
        $('#withdrawStatus').html(err.toString());
        console.error(err);
    }
}

async function claimBack() {
    try {
        const remittance = await Remittance.deployed();
        const hashValue = $('input[name="hashValue"]').val();

        const txObj = await remittance.claimBack(
            hashValue,
            { from: remitCreator }
        ).on(
            'transactionHash',
            txHash => $('#claimBackStatus').html('Transaction on the way ' + txHash)
        );

        const receipt = txObj.receipt;
        console.log('Got Receipt', receipt);
        if (!receipt.status) {
            console.error('Wrong Status');
            console.error(receipt);
            $('#claimBackStatus').html('There was an error in the tx execution, status not 1');
        } else if (receipt.logs.length == 0) {
            console.error('Empty logs');
            console.error(receipt);
            $('#claimBackStatus').html('There was an error in the tx execution, missing expected event');
        } else {
            console.log(receipt.logs[0]);
            $('#claimBackStatus').html('Transfer executed with Tx Hash: '+receipt.transactionHash);
        }

        updateBalance(remittance);

    } catch (err) {
        $('#claimBackStatus').html(err.toString());
        console.error(err);
    }
}

window.addEventListener('load', async () => {
    try {
        const accounts = await web3.eth.getAccounts();
        console.log(accounts);
        if (!accounts.length) {
            $('#balance').html('N/A');
            throw new Error('No account with which to transact. NOTE: Don\'t forget to disable MetaMask');
        }

        owner = accounts[0];
        remitCreator = accounts[1];
        user = accounts[2];
        exchanger = accounts[3];
        console.log('Owner: ', owner);
        console.log('Remit Creator: ', remitCreator);
        console.log('User: ', user);
        console.log('Exchanger: ', exchanger);

        const remittance = await Remittance.deployed();

        const network = await web3.eth.net.getId();
        console.log('Network ID: ', network.toString(10));

        updateBalance(remittance);

        $("#remit").click(remit);
        $("#withdraw").click(withdraw);
        $("#exchange").click(exchange);
        $("#claimBack").click(claimBack);
    } catch (err) {
        console.error(err);
    }

});
