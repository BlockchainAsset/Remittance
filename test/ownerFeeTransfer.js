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

  it('Should withdraw the amount correctly for owner', async () => {
    // Make transaction from alice account to remit function.
    await remittanceInstance.remit(bobCarolSecret, bob, carol, time, {from: alice, value: amount});

    // Get initial balance of the account before the transaction is made.
    let ownerStartingBalance = new BN(await web3.eth.getBalance(owner));

    // Withdraw amount from contract to Owner
    let ownerFeeTransferTxReceipt = await remittanceInstance.ownerFeeTransfer(hundred, {from: owner});
    let ownerFeeTransferGasUsed = new BN(ownerFeeTransferTxReceipt.receipt.gasUsed);
    let ownerFeeTransferGasPrice = new BN((await web3.eth.getTransaction(ownerFeeTransferTxReceipt.tx)).gasPrice);

    // Get balance of Owner after the transactions.
    let ownerEndingBalance = new BN(await web3.eth.getBalance(owner));

    let ownerStartAmountGas = hundred.add(ownerStartingBalance).sub(ownerFeeTransferGasUsed.mul(ownerFeeTransferGasPrice));

    // Check if the result is correct or not
    assert.isTrue(ownerEndingBalance.eq(ownerStartAmountGas), "Amount wasn't correctly received by Owner");
  });

  it('Should only work if amount > 0', async () => {
    await truffleAssert.fails(
      remittanceInstance.ownerFeeTransfer(zero, {from: owner}),
      null,
      'Zero cant be withdrawn'
    );
  })

  it('Should only work if balance > 0', async () => {
    await truffleAssert.fails(
      remittanceInstance.ownerFeeTransfer(hundred, {from: owner}),
      null,
      'Withdraw amount requested higher than balance'
    );
  })

  it("Should correctly emit the proper event: OwnerCut", async () => {
    const remitReceipt = await remittanceInstance.remit(bobCarolSecret, bob, carol, time, {from: alice, value: amount});
    const withdrawReceipt = await remittanceInstance.ownerFeeTransfer(hundred, {from: owner});
    const log = withdrawReceipt.logs[0];
    const remittanceAddress = remitReceipt.logs[0].address;

    assert.strictEqual(withdrawReceipt.logs.length, 1);
    assert.strictEqual(log.event, "OwnerCut");
    assert.strictEqual(log.address, remittanceAddress);
    assert.strictEqual(log.args.owner, owner);
    assert.isTrue(log.args.value.eq(hundred));
  });

});
