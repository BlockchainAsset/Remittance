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
    bobCarolSecret = await remittanceInstance.encrypt(bobSecretBytes, carolSecretBytes, {from: alice});
  });

  describe("Function: exchange", function() {

    describe("Basic Working", function() {
      it('Should exchange the amount correctly', async () => {
        // Make transaction from alice account to remit function.
        await remittanceInstance.remit(bobCarolSecret, carol, time, {from: alice, value: amount});
    
        // Get initial balance of Carol in the contract before the transaction is made.
        let carolContractStartingBalance = new BN(await remittanceInstance.balances(carol));
    
        // Exchange amount from Bob to Carol
        await remittanceInstance.exchange(bobSecretBytes, carolSecretBytes, {from: carol});
    
        // Get the final balance of Carol in the contract after the transaction is made.
        let carolContractEndingBalance = new BN(await remittanceInstance.balances(carol));
    
        // Check if the result is correct or not
        assert.isTrue(carolContractEndingBalance.eq(amount.add(carolContractStartingBalance).sub(hundred)), "Amount wasn't correctly received by Carol");
    
      });
    });
    
    describe("Edge Cases", function() {
      it('Should only allow if Secret of Bob is Correct', async () => {
        await remittanceInstance.remit(bobCarolSecret, carol, time, {from: alice, value: amount});
        await truffleAssert.fails(
          remittanceInstance.exchange(fakeSecretBytes, carolSecretBytes, {from: carol}),
          null,
          // This is because as the hashValue is new, the exchanger address is checked initially which is set to default value 0
          'Only that particular exchange can do this'
        );
      });
    
      it('Should only allow if Secret of Carol is Correct', async () => {
        await remittanceInstance.remit(bobCarolSecret, carol, time, {from: alice, value: amount});
        await truffleAssert.fails(
          remittanceInstance.exchange(bobSecretBytes, fakeSecretBytes, {from: carol}),
          null,
          // This is because as the hashValue is new, the exchanger address is checked initially which is set to default value 0
          'Only that particular exchange can do this'
        );
      });
    
      it('Should only work if atleast 1 Wei is to be exchanged', async () => {
        await remittanceInstance.remit(bobCarolSecret, carol, time, {from: alice, value: amount});
        await remittanceInstance.exchange(bobSecretBytes, carolSecretBytes, {from: carol});
        await truffleAssert.fails(
          remittanceInstance.exchange(bobSecretBytes, carolSecretBytes, {from: carol}),
          null,
          'Remittance Completed/Claimed Back'
        );
      });

      it('Should only allow Carol to exchange for Bob', async () => {
        await remittanceInstance.remit(bobCarolSecret, carol, time, {from: alice, value: amount});
        await truffleAssert.fails(
          remittanceInstance.exchange(bobSecretBytes, carolSecretBytes, {from: owner}),
          null,
          'Only that particular exchange can do this'
        );
      });
    });
    
    describe("Input Cases", function() {
      it('Should only work if secret of Bob is given', async () => {
        await remittanceInstance.remit(bobCarolSecret, carol, time, {from: alice, value: amount});
        await truffleAssert.fails(
          remittanceInstance.exchange(carolSecretBytes, {from: carol}),
          null,
          'invalid bytes32'
        );
      });
    
      it('Should only work if secret of Carol is given', async () => {
        await remittanceInstance.remit(bobCarolSecret, carol, time, {from: alice, value: amount});
        await truffleAssert.fails(
          remittanceInstance.exchange(bobSecretBytes, {from: carol}),
          null,
          'invalid bytes32'
        );
      });
    });
    
    describe("Event Cases", function() {
      it("Should correctly emit the proper event: Remit", async () => {
        const remitReceipt = await remittanceInstance.remit(bobCarolSecret, carol, time, {from: alice, value: hundred});
        const exchangeReceipt = await remittanceInstance.exchange(bobSecretBytes, carolSecretBytes, {from: carol});
        const log = exchangeReceipt.logs[0];
        const remittanceAddress = remitReceipt.logs[0].address;
    
        assert.strictEqual(exchangeReceipt.logs.length, 1);
        assert.strictEqual(log.event, "Exchange");
        assert.strictEqual(log.address, remittanceAddress);
        assert.strictEqual(log.args.exchanger, carol);
        assert.isTrue(log.args.value.eq(hundred));
      });
    });
    
  });
});