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

  it('Should withdraw the amount correctly', async () => {
    // Make transaction from alice account to remit function.
    await remittanceInstance.remit(bobCarolSecret, bob, carol, time, {from: alice, value: amount});

    // Exchange amount from bob to carol
    await remittanceInstance.exchange(bob, bobSecretBytes, carolSecretBytes, {from: carol});

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

  it('Should only work if amount > 0', async () => {
    await truffleAssert.fails(
      remittanceInstance.withdraw(zero, {from: carol}),
      null,
      'Zero cant be withdrawn'
    );
  })

  it('Should only work if balance > 0', async () => {
    await remittanceInstance.remit(bobCarolSecret, bob, carol, time, {from: alice, value: hundred});
    await remittanceInstance.exchange(bob, bobSecretBytes, carolSecretBytes, {from: carol});
    await remittanceInstance.withdraw(hundred, {from: carol}),
    await truffleAssert.fails(
      remittanceInstance.withdraw(hundred, {from: carol}),
      null,
      'Withdraw amount requested higher than balance'
    );
  })

  it("Should correctly emit the proper event: Transfered", async () => {
    const remitReceipt = await remittanceInstance.remit(bobCarolSecret, bob, carol, time, {from: alice, value: hundred});
    await remittanceInstance.exchange(bob, bobSecretBytes, carolSecretBytes, {from: carol});
    const withdrawReceipt = await remittanceInstance.withdraw(hundred, {from: carol});
    const log = withdrawReceipt.logs[0];
    const remittanceAddress = remitReceipt.logs[0].address;

    assert.strictEqual(withdrawReceipt.logs.length, 1);
    assert.strictEqual(log.event, "Transfered");
    assert.strictEqual(log.address, remittanceAddress);
    assert.strictEqual(log.args.to, carol);
    assert.isTrue(log.args.value.eq(hundred));
  });

});
