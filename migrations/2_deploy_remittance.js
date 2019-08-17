const Remittance = artifacts.require("Remittance");

module.exports = function(deployer, network, accounts) {
  console.log("network:", network);
  console.log("accounts:", accounts);
  deployer.deploy(Remittance, true);
};
