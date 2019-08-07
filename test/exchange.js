const BN = web3.utils.BN;

const remittance = artifacts.require("Remittance");

const truffleAssert = require('truffle-assertions');

const amount = new BN(web3.utils.toWei('1')); // <-- Change ETH value to be tested here
const zero = new BN('0');
const one = new BN('1');
const two = new BN('2');
const five = new BN('5');
const ten = new BN('10');
const hundred = new BN('100');
const time = 3600 // Around an hour
const shortTime = 1 // Just a second
const amountByTwo = amount.div(two);
const amountByTen = amount.div(ten);
const twoEtherInWei = new BN(web3.utils.toWei("2"));
const zeroAdd = "0x0000000000000000000000000000000000000000";
const bobSecretBytes = web3.utils.fromAscii("bobSecret");
const carolSecretBytes = web3.utils.fromAscii("carolSecret");
const fakeSecretBytes = web3.utils.fromAscii("secret");
const bobCarolSecret = web3.utils.keccak256(web3.eth.abi.encodeParameters(['bytes32', 'bytes32'],[bobSecretBytes,carolSecretBytes]))
const fakeBobCarolSecret = web3.utils.keccak256(web3.eth.abi.encodeParameters(['bytes32', 'bytes32'],[fakeSecretBytes,carolSecretBytes]))
const bobFakeCarolSecret = web3.utils.keccak256(web3.eth.abi.encodeParameters(['bytes32', 'bytes32'],[bobSecretBytes,fakeSecretBytes]))

contract('Remittance', (accounts) => {

  var remittanceInstance;
  var owner, alice, bob, carol;

  before("Preparing Accounts and Initial Checks", async function() {
    assert.isAtLeast(accounts.length, 3, "Atleast three accounts required");

    // Setup 4 accounts.
    [owner, alice, bob, carol] = accounts;

    //Checking if all accounts have atleast 2 ETH or more for test
    assert.isTrue((new BN(await web3.eth.getBalance(owner))).gt(twoEtherInWei), "Owner Account has less than 2 ETH");
    assert.isTrue((new BN(await web3.eth.getBalance(alice))).gt(twoEtherInWei), "Alice Account has less than 2 ETH");
    assert.isTrue((new BN(await web3.eth.getBalance(bob))).gt(twoEtherInWei), "Bob Account has less than 2 ETH");
    assert.isTrue((new BN(await web3.eth.getBalance(carol))).gt(twoEtherInWei), "Carol Account has less than 2 ETH");

  })

  beforeEach(async function() {
    remittanceInstance = await remittance.new({ from: owner});
  });

  it('Should exchange the amount correctly', async () => {
    // Make transaction from alice account to remit function.
    await remittanceInstance.remit(bobCarolSecret, bob, carol, time, {from: alice, value: amount});

    // Get initial balance of Carol in the contract before the transaction is made.
    let carolContractStartingBalance = new BN(await remittanceInstance.carolDetails(carol));

    // Exchange amount from Bob to Carol
    await remittanceInstance.exchange(bob, bobSecretBytes, carolSecretBytes, {from: carol});

    // Get the final balance of Carol in the contract after the transaction is made.
    let carolContractEndingBalance = new BN(await remittanceInstance.carolDetails(carol));

    // Check if the result is correct or not
    assert.isTrue(carolContractEndingBalance.eq(amount.add(carolContractStartingBalance).sub(hundred)), "Amount wasn't correctly received by Carol");

  });

  it('Should only allow Carol to exchange for Bob', async () => {
    await remittanceInstance.remit(bobCarolSecret, bob, carol, time, {from: alice, value: amount});
    await truffleAssert.fails(
      remittanceInstance.exchange(bob, bobSecretBytes, carolSecretBytes, {from: owner}),
      null,
      'Only that particular exchange can do this'
    );
  });

  it('Should only allow if Secret of Bob is Correct', async () => {
    await remittanceInstance.remit(bobCarolSecret, bob, carol, time, {from: alice, value: amount});
    await truffleAssert.fails(
      remittanceInstance.exchange(bob, fakeSecretBytes, carolSecretBytes, {from: carol}),
      null,
      'Password is incorrect.'
    );
  });

  it('Should only allow if Secret of Carol is Correct', async () => {
    await remittanceInstance.remit(bobCarolSecret, bob, carol, time, {from: alice, value: amount});
    await truffleAssert.fails(
      remittanceInstance.exchange(bob, bobSecretBytes, fakeSecretBytes, {from: carol}),
      null,
      'Password is incorrect.'
    );
  });

  it('Should only work if atleast 1 Wei is to be exchanged', async () => {
    await remittanceInstance.remit(bobCarolSecret, bob, carol, time, {from: alice, value: amount});
    await remittanceInstance.exchange(bob, bobSecretBytes, carolSecretBytes, {from: carol});
    await truffleAssert.fails(
      remittanceInstance.exchange(bob, bobSecretBytes, carolSecretBytes, {from: carol}),
      null,
      'Nothing to Withdraw'
    );
  });

  it('Should only work if Bob address is given', async () => {
    await remittanceInstance.remit(bobCarolSecret, bob, carol, time, {from: alice, value: amount});
    await truffleAssert.fails(
      remittanceInstance.exchange(bobSecretBytes, carolSecretBytes, {from: carol}),
      null,
      'invalid address'
    );
  });

  it('Should only work if Bob address is valid', async () => {
    await truffleAssert.fails(
      remittanceInstance.exchange(zeroAdd, bobSecretBytes, carolSecretBytes, {from: carol}),
      null,
      'Bob should be a valid address'
    );
  });

  it('Should only work if secret of Bob is given', async () => {
    await remittanceInstance.remit(bobCarolSecret, bob, carol, time, {from: alice, value: amount});
    await truffleAssert.fails(
      remittanceInstance.exchange(bob, carolSecretBytes, {from: carol}),
      null,
      'invalid bytes32'
    );
  });

  it('Should only work if secret of Carol is given', async () => {
    await remittanceInstance.remit(bobCarolSecret, bob, carol, time, {from: alice, value: amount});
    await truffleAssert.fails(
      remittanceInstance.exchange(bob, bobSecretBytes, {from: carol}),
      null,
      'invalid bytes32'
    );
  });

  it("Should correctly emit the proper event: Remit", async () => {
    const remitReceipt = await remittanceInstance.remit(bobCarolSecret, bob, carol, time, {from: alice, value: hundred});
    const exchangeReceipt = await remittanceInstance.exchange(bob, bobSecretBytes, carolSecretBytes, {from: carol});
    const log = exchangeReceipt.logs[0];
    const remittanceAddress = remitReceipt.logs[0].address;

    assert.strictEqual(exchangeReceipt.logs.length, 1);
    assert.strictEqual(log.event, "Exchange");
    assert.strictEqual(log.address, remittanceAddress);
    assert.strictEqual(log.args.from, bob);
    assert.strictEqual(log.args.to, carol);
    assert.isTrue(log.args.value.eq(hundred));
  });

});