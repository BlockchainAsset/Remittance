const BN = web3.utils.BN;

const remittance = artifacts.require("Remittance");

const truffleAssert = require('truffle-assertions');

const amount = new BN(web3.utils.toWei('1')); // <-- Change ETH value to be tested here
const zero = new BN('0');
const hundred = new BN('100');
const time = 3600 // Around an hour
const shortTime = 1 // Just a second
const twoEtherInWei = new BN(web3.utils.toWei("2"));
const zeroAdd = "0x0000000000000000000000000000000000000000";
const bobSecretBytes = web3.utils.fromAscii("bobSecret");
const carolSecretBytes = web3.utils.fromAscii("carolSecret");
const fakeSecretBytes = web3.utils.fromAscii("secret");

function wait(second){
  var start = new Date().getTime();
  var end = start;
  while(end < start + (second*1000)) {
    end = new Date().getTime();
 }
}

contract('Remittance', (accounts) => {

  var remittanceInstance;
  var owner, alice, bob, carol;
  var bobCarolSecret;

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

  it('Should claim back the amount correctly', async () => {
    // Make transaction from alice account to remit function.
    await remittanceInstance.remit(bobCarolSecret, bob, carol, shortTime, {from: alice, value: amount});

    // To wait atleast 2 seconds before executing this to force the start of claim period
    wait(2);

    // Get initial balance of Alice before the transaction is made.
    let aliceStartingBalance = new BN(await web3.eth.getBalance(alice));

    // Claim Back amount from Bob
    let aliceClaimBackTxReceipt = await remittanceInstance.claimBack(bob, bobSecretBytes, carolSecretBytes, {from: alice});
    let aliceClaimBackGasUsed = new BN(aliceClaimBackTxReceipt.receipt.gasUsed);
    let aliceClaimBackGasPrice = new BN((await web3.eth.getTransaction(aliceClaimBackTxReceipt.tx)).gasPrice);

    // Get final balance of Alice before the transaction is made.
    let aliceEndingBalance = new BN(await web3.eth.getBalance(alice));

    let aliceStartAmountGas = amount.add(aliceStartingBalance).sub(hundred).sub(aliceClaimBackGasUsed.mul(aliceClaimBackGasPrice));

    // Check if the result is correct or not
    assert.isTrue(aliceEndingBalance.eq(aliceStartAmountGas), "Amount wasn't correctly received by Alice");

  });

  it('Should only allow to claim back if the deadline is passed', async () => {
    await remittanceInstance.remit(bobCarolSecret, bob, carol, time, {from: alice, value: amount});
    await truffleAssert.fails(
      remittanceInstance.claimBack(bob, bobSecretBytes, carolSecretBytes, {from: alice}),
      null,
      'Claim Period has not started yet'
    );
  });

  it('Should only allow to claim back if the exchange is not done yet', async () => {
    await remittanceInstance.remit(bobCarolSecret, bob, carol, time, {from: alice, value: amount});
    await remittanceInstance.exchange(bob, bobSecretBytes, carolSecretBytes, {from: carol});
    await truffleAssert.fails(
      remittanceInstance.claimBack(bob, bobSecretBytes, carolSecretBytes, {from: alice}),
      null,
      'Exchange is already complete'
    );
  });

  it('Should only allow Alice to claim back from Bob through secret keys', async () => {
    await remittanceInstance.remit(bobCarolSecret, bob, carol, shortTime, {from: alice, value: amount});
    await truffleAssert.fails(
      remittanceInstance.claimBack(bob, bobSecretBytes, carolSecretBytes, {from: owner}),
      null,
      'Only Remit Creator can claim back'
    );
  });

  it('Should only allow if Secret of Bob is Correct', async () => {
    await remittanceInstance.remit(bobCarolSecret, bob, carol, shortTime, {from: alice, value: amount});
    await truffleAssert.fails(
      remittanceInstance.claimBack(bob, fakeSecretBytes, carolSecretBytes, {from: alice}),
      null,
      // This is because as the hashValue is new, the Remit Creator address is checked initially which is set to default value 0x0
      'Only Remit Creator can claim back'
    );
  });

  it('Should only allow if Secret of Carol is Correct', async () => {
    await remittanceInstance.remit(bobCarolSecret, bob, carol, shortTime, {from: alice, value: amount});
    await truffleAssert.fails(
      remittanceInstance.claimBack(bob, bobSecretBytes, fakeSecretBytes, {from: alice}),
      null,
      // This is because as the hashValue is new, the Remit Creator address is checked initially which is set to default value 0x0
      'Only Remit Creator can claim back'
    );
  });

  it('Should only work if Bob address is given', async () => {
    await remittanceInstance.remit(bobCarolSecret, bob, carol, time, {from: alice, value: amount});
    await truffleAssert.fails(
      remittanceInstance.claimBack(bobSecretBytes, carolSecretBytes, {from: alice}),
      null,
      'invalid address'
    );
  });

  it('Should only work if Bob address is valid', async () => {
    await truffleAssert.fails(
      remittanceInstance.claimBack(zeroAdd, bobSecretBytes, carolSecretBytes, {from: alice}),
      null,
      'User address should be a valid address'
    );
  });

  it('Should only work if secret of Bob is given', async () => {
    await remittanceInstance.remit(bobCarolSecret, bob, carol, time, {from: alice, value: amount});
    await truffleAssert.fails(
      remittanceInstance.claimBack(bob, carolSecretBytes, {from: alice}),
      null,
      'invalid bytes32'
    );
  });

  it('Should only work if secret of Carol is given', async () => {
    await remittanceInstance.remit(bobCarolSecret, bob, carol, time, {from: alice, value: amount});
    await truffleAssert.fails(
      remittanceInstance.claimBack(bob, bobSecretBytes, {from: alice}),
      null,
      'invalid bytes32'
    );
  });

  it("Should correctly emit the proper event: ClaimBack", async () => {
    const remitReceipt = await remittanceInstance.remit(bobCarolSecret, bob, carol, shortTime, {from: alice, value: hundred});
    wait(2);
    const claimBackReceipt = await remittanceInstance.claimBack(bob, bobSecretBytes, carolSecretBytes, {from: alice});
    const log = claimBackReceipt.logs[0];
    const remittanceAddress = remitReceipt.logs[0].address;

    assert.strictEqual(claimBackReceipt.logs.length, 1);
    assert.strictEqual(log.event, "ClaimBack");
    assert.strictEqual(log.address, remittanceAddress);
    assert.strictEqual(log.args.remitCreator, alice);
    assert.isTrue(log.args.value.eq(hundred));
  });

});