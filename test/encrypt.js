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
const bobCarolSecret = web3.utils.keccak256(web3.eth.abi.encodeParameters(['bytes32', 'bytes32'],[bobSecretBytes,carolSecretBytes]))

contract('Remittance', (accounts) => {

  let remittanceInstance;
  let owner, alice, bob, carol;

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
  });

  it('Should encrypt the values correctly', async () => {
      let encryptBobCarolSecret = await remittanceInstance.encrypt(bobSecretBytes, carolSecretBytes, {from: alice});

      assert.strictEqual(bobCarolSecret, encryptBobCarolSecret, "Hash Values don't match");
  });

  it('Should only work if two words are given', async () => {
    await truffleAssert.fails(
        remittanceInstance.encrypt(carolSecretBytes, {from: alice}),
      null,
      'invalid bytes32 value'
    );
  });

});