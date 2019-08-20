const { BN, fromAscii, toWei } = web3.utils;

const remittance = artifacts.require("Remittance");

const truffleAssert = require('truffle-assertions');

const amount = new BN(toWei('1')); // <-- Change ETH value to be tested here
const zero = new BN('0');
const hundred = new BN('100');
const time = 3600 // Around an hour
const twoEtherInWei = new BN(toWei("2"));
const bobSecretBytes = fromAscii("bobSecret");

contract('Remittance', (accounts) => {

  let remittanceInstance;
  let owner, alice, bob, carol;
  let bobCarolHash;

  before("Preparing Accounts and Initial Checks", async function() {
    assert.isAtLeast(accounts.length, 4, "Atleast four accounts required");

    // Setup 4 accounts.
    [owner, alice, bob, carol] = accounts;

    //Checking if all accounts have atleast 2 ETH or more for test
    assert.isTrue((new BN(await web3.eth.getBalance(owner))).gt(twoEtherInWei), "Owner Account has less than 2 ETH");
    assert.isTrue((new BN(await web3.eth.getBalance(alice))).gt(twoEtherInWei), "Alice Account has less than 2 ETH");
    assert.isTrue((new BN(await web3.eth.getBalance(bob))).gt(twoEtherInWei), "Bob Account has less than 2 ETH");
    assert.isTrue((new BN(await web3.eth.getBalance(carol))).gt(twoEtherInWei), "Carol Account has less than 2 ETH");

  })

  beforeEach("Creating New Instance", async function() {
    remittanceInstance = await remittance.new({ from: owner});

    // Get the hashValue first
    bobCarolHash = await remittanceInstance.encrypt(bobSecretBytes, carol, {from: alice});
  });

  describe("Function: withdraw", function() {

    describe("Basic Working", function() {

      it('Should withdraw the amount correctly', async () => {
        // Make transaction from alice account to remit function.
        await remittanceInstance.remit(bobCarolHash, time, {from: alice, value: amount});
    
        // Exchange amount from bob to carol
        await remittanceInstance.exchange(bobSecretBytes, {from: carol});
    
        // Get initial balance of the account before the transaction is made.
        let startingBalanceOfCarol = new BN(await web3.eth.getBalance(carol));
    
        // Withdraw amount from carol
        let txReceiptOfWithdraw = await remittanceInstance.withdraw(hundred, {from: carol});
        let gasUsedInWithdraw = new BN(txReceiptOfWithdraw.receipt.gasUsed);
        let gasPriceInWithdraw = new BN((await web3.eth.getTransaction(txReceiptOfWithdraw.tx)).gasPrice);
    
        // Get balance of carol after the transactions.
        let endingBalanceOfCarol = new BN(await web3.eth.getBalance(carol));
    
        let carolStartAmountGas = startingBalanceOfCarol.add(hundred).sub(gasUsedInWithdraw.mul(gasPriceInWithdraw));
    
        // Check if the result is correct or not
        assert.isTrue(endingBalanceOfCarol.eq(carolStartAmountGas), "Amount wasn't correctly received by Carol");
      });
      
    });

    describe("Edge Cases", function() {

      it('Should only work if amount > 0', async () => {
        await truffleAssert.fails(
          remittanceInstance.withdraw(zero, {from: carol}),
          null,
          'Zero cant be withdrawn'
        );
      })
    
      it('Should only work if balance > amount', async () => {
        await remittanceInstance.remit(bobCarolHash, time, {from: alice, value: hundred});
        await remittanceInstance.exchange(bobSecretBytes, {from: carol});
        await remittanceInstance.withdraw(hundred, {from: carol}),
        await truffleAssert.fails(
          remittanceInstance.withdraw(hundred, {from: carol}),
          null,
          'SafeMath: subtraction overflow.'
        );
      })
  
    });

    describe("Input Cases", function() {

      it('Should only work if amount is given', async () => {
        await truffleAssert.fails(
          remittanceInstance.withdraw({from: carol}),
          null,
          'invalid number value'
        );
      })

    });

    describe("Event Cases", function() {
  
      it("Should correctly emit the proper event: Transfered", async () => {
        const remitReceipt = await remittanceInstance.remit(bobCarolHash, time, {from: alice, value: hundred});
        await remittanceInstance.exchange(bobSecretBytes, {from: carol});
        const withdrawReceipt = await remittanceInstance.withdraw(hundred, {from: carol});
        const log = withdrawReceipt.logs[0];
        const remittanceAddress = remitReceipt.logs[0].address;
    
        assert.strictEqual(withdrawReceipt.logs.length, 1);
        assert.strictEqual(log.event, "Withdrawed");
        assert.strictEqual(log.address, remittanceAddress);
        assert.strictEqual(log.args.to, carol);
        assert.isTrue(log.args.value.eq(hundred));
      });  
  
    });

  });

});
