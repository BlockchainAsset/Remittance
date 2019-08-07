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

  it('Should remit the coin correctly', async () => {
    // Make transaction from Alice to remit function.
    await remittanceInstance.remit(bobCarolSecret, bob, carol, time, {from: alice, value: amount});

    // Get Balance of Carol After Transfer
    let bobContractEndingBalance = await remittanceInstance.getBalanceOf(bob);

    // Check if the result is correct or not
    assert.isTrue(bobContractEndingBalance.eq(amount.sub(hundred)), "Amount wasn't correctly received by Bob");
  });

  it('Owner should not take a cut if transferred value is less than 10K Wei', async () => {
    // Make transaction from Alice to remit function.
    await remittanceInstance.remit(bobCarolSecret, bob, carol, time, {from: alice, value: hundred});

    // Get Balance of Carol After Transfer
    let bobContractEndingBalance = await remittanceInstance.getBalanceOf(bob);

    // Check if the result is correct or not
    assert.isTrue(bobContractEndingBalance.eq(hundred), "Amount wasn't correctly received by Bob");
  });

  it('Should Only work if atleast 1 Wei is sent to remit', async () => {
    await truffleAssert.fails(
      remittanceInstance.remit(bobCarolSecret, bob, carol, time, {from: alice, value: zero}),
      null,
      'Amount should be atleast 1 wei'
    );
  });

  it('Should only work if Bob address are given', async () => {
    await truffleAssert.fails(
      remittanceInstance.remit(bobCarolSecret, carol, time, {from: alice, value: amount}),
      null,
      'invalid address'
    );
  });

  it('Should only work if Carol address are given', async () => {
    await truffleAssert.fails(
      remittanceInstance.remit(bobCarolSecret, bob, time, {from: alice, value: amount}),
      null,
      'invalid address'
    );
  });

  it('Should Only work if Bob Address is valid', async () => {
    await truffleAssert.fails(
      remittanceInstance.remit(bobCarolSecret, zeroAdd, carol, time, {from: alice, value: amount}),
      null,
      'Bob should be a valid address'
    );
  });

  it('Should Only work if Carol Address is valid', async () => {
    await truffleAssert.fails(
      remittanceInstance.remit(bobCarolSecret, bob, zeroAdd, time, {from: alice, value: amount}),
      null,
      'Carol should be a valid address'
    );
  });

  it("Should correctly emit the proper event: Remit", async () => {
    const receipt = await remittanceInstance.remit(bobCarolSecret, bob, carol, time, {from: alice, value: amount});
    const log = receipt.logs[0];

    assert.strictEqual(receipt.logs.length, 1);
    assert.strictEqual(log.event, "Remit");
    assert.strictEqual(log.args.bob, bob);
    assert.strictEqual(log.args.carol, carol);
    assert.isTrue(log.args.value.eq(amount.sub(hundred)));
  });

});
