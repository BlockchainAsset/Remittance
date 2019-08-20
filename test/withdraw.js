const { BN, fromAscii, toWei } = web3.utils;

const remittance = artifacts.require("Remittance");

const truffleAssert = require('truffle-assertions');

const amount = new BN(toWei('1')); // <-- Change ETH value to be tested here
const zero = new BN('0');
const hundred = new BN('100');
const time = 3600 // Around an hour
const shortTime = 1 // Just a second
const twoEtherInWei = new BN(toWei("2"));
const zeroAdd = "0x0000000000000000000000000000000000000000";
const bobSecretBytes = fromAscii("bobSecret");
const carolSecretBytes = fromAscii("carolSecret");
const fakeSecretBytes = fromAscii("secret");

contract('Remittance', (accounts) => {

  let remittanceInstance;
  let owner, alice, bob, carol;
  let bobCarolSecret;

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
    bobCarolSecret = await remittanceInstance.encrypt(bobSecretBytes, carol, {from: alice});
  });

  describe("Function: withdraw", function() {

    describe("Basic Working", function() {

      it('Should withdraw the amount correctly', async () => {
        // Make transaction from alice account to remit function.
        await remittanceInstance.remit(bobCarolSecret, carol, time, {from: alice, value: amount});
    
        // Exchange amount from bob to carol
        await remittanceInstance.exchange(bobSecretBytes, {from: carol});
    
        // Get initial balance of the account before the transaction is made.
        let carolStartingBalance = new BN(await web3.eth.getBalance(carol));
    
        // Withdraw amount from carol
        let carolWithdrawTxReceipt = await remittanceInstance.withdraw(hundred, {from: carol});
        let carolWithdrawGasUsed = new BN(carolWithdrawTxReceipt.receipt.gasUsed);
        let carolWithdrawGasPrice = new BN((await web3.eth.getTransaction(carolWithdrawTxReceipt.tx)).gasPrice);
    
        // Get balance of carol after the transactions.
        let carolEndingBalance = new BN(await web3.eth.getBalance(carol));
    
        let carolStartAmountGas = hundred.add(carolStartingBalance).sub(carolWithdrawGasUsed.mul(carolWithdrawGasPrice));
    
        // Check if the result is correct or not
        assert.isTrue(carolEndingBalance.eq(carolStartAmountGas), "Amount wasn't correctly received by Carol");
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
        await remittanceInstance.remit(bobCarolSecret, carol, time, {from: alice, value: hundred});
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
        const remitReceipt = await remittanceInstance.remit(bobCarolSecret, carol, time, {from: alice, value: hundred});
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
