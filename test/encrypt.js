const { BN, fromAscii, toWei, soliditySha3 } = web3.utils;

const remittance = artifacts.require("Remittance");

const truffleAssert = require('truffle-assertions');

const twoEtherInWei = new BN(toWei("2"));
const bobSecretBytes = fromAscii("bobSecret");

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

  beforeEach("Creating New Instance", async function() {
    remittanceInstance = await remittance.new({ from: owner});
  });

  describe("Function: encrypt", function() {

    describe("Basic Working", function() {

      it('Should encrypt the values correctly', async () => {
        let bobCarolHash = soliditySha3({type: 'bytes32', value: bobSecretBytes}, {type: 'address', value: carol}, {type: 'address', value: remittanceInstance.address});
        let encryptBobCarolHash = await remittanceInstance.encrypt(bobSecretBytes, carol, {from: alice});
  
        assert.strictEqual(bobCarolHash, encryptBobCarolHash, "Hash Values don't match");
      });
  
    });

    describe("Input Cases", function() {

      it('Should only work if two inputs are given', async () => {
        await truffleAssert.fails(
          remittanceInstance.encrypt(carol, {from: alice}),
          null,
          'invalid address'
        );
      });
        
    });

  });

});