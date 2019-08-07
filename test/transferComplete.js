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

  it('Should update the transfer status correctly', async () => {
    // Make transaction from Alice account to remit function.
    await remittanceInstance.remit(bobCarolSecret, bob, carol, time, {from: alice, value: amount});

    // Exchange amount from Bob to Carol
    await remittanceInstance.exchange(bob, bobSecretBytes, carolSecretBytes, {from: carol});

    // Get the status of the exchange.
    let bobTransferStatus = await remittanceInstance.transferComplete(bob);

    assert.isTrue(bobTransferStatus, "Amount wasn't correctly exchanged between Bob and Carol");
  });

  it('Should show the status as False when the transfer is not complete', async () => {
    // Make transaction from Alice account to remit function.
    await remittanceInstance.remit(bobCarolSecret, bob, carol, time, {from: alice, value: amount});

    // Get the status of the exchange.
    let bobTransferStatus = await remittanceInstance.transferComplete(bob);

    assert.isFalse(bobTransferStatus, "Amount was already exchanged between Bob and Carol");
  });

  it('Should only work if address is given', async () => {
    try
    {
      await remittanceInstance.transferComplete(bob);
    }
    catch (err)
    {
      assert.include(err.toString(), 'Error: Invalid number of parameters for "getBalanceOf". Got 0 expected 1!');
    }
  })

});
