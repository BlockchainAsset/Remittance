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

  beforeEach(async function() {
    remittanceInstance = await remittance.new({ from: owner});

    // Get the hashValue first
    bobCarolSecret = await remittanceInstance.encrypt(bobSecretBytes, carolSecretBytes, {from: alice});
  });

  it('Should remit the coin correctly', async () => {
    // Make transaction from Alice to remit function.
    await remittanceInstance.remit(bobCarolSecret, carol, time, {from: alice, value: amount});

    // Get Balance of Bob After Transfer
    let bobContractEndingBalance = (await remittanceInstance.remittances(bobCarolSecret)).amount;

    // Check if the result is correct or not
    assert.isTrue(bobContractEndingBalance.eq(amount.sub(hundred)), "Amount wasn't correctly received by Bob");
  });

  it('Remit should not be allowed with the same hashValue as any previous Remit', async () => {
    await remittanceInstance.remit(bobCarolSecret, carol, time, {from: alice, value: amount});
    await truffleAssert.fails(
      remittanceInstance.remit(bobCarolSecret, carol, time, {from: alice, value: amount}),
      null,
      'The hashValue should be unique'
    );

  });

  it('Owner should not take a cut if transferred value is less than 10K Wei', async () => {
    
    await remittanceInstance.remit(bobCarolSecret, carol, time, {from: alice, value: hundred});
    let bobContractEndingBalance = (await remittanceInstance.remittances(bobCarolSecret)).amount;

    // Check if the result is correct or not
    assert.isTrue(bobContractEndingBalance.eq(hundred), "Amount wasn't correctly received by Bob");
  });

  it('Should Only work if atleast 1 Wei is sent to remit', async () => {
    await truffleAssert.fails(
      remittanceInstance.remit(bobCarolSecret, carol, time, {from: alice, value: zero}),
      null,
      'Amount should be atleast 1 wei'
    );
  });

  it('Should only work if Carol address is given', async () => {
    await truffleAssert.fails(
      remittanceInstance.remit(bobCarolSecret, time, {from: alice, value: amount}),
      null,
      'invalid address'
    );
  });

  it('Should Only work if Carol Address is valid', async () => {
    await truffleAssert.fails(
      remittanceInstance.remit(bobCarolSecret, zeroAdd, time, {from: alice, value: amount}),
      null,
      'Exchanger address should be a valid address'
    );
  });

  it("Should correctly emit the proper event: Remit", async () => {
    const receipt = await remittanceInstance.remit(bobCarolSecret, carol, time, {from: alice, value: amount});
    const log = receipt.logs[0];

    assert.strictEqual(receipt.logs.length, 1);
    assert.strictEqual(log.event, "Remit");
    assert.strictEqual(log.args.exchanger, carol);
    assert.isTrue(log.args.value.eq(amount.sub(hundred)));
  });

});
