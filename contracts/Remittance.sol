pragma solidity >=0.4.22 <0.6.0;

import "./Stoppable.sol";
import "./SafeMath.sol";

contract Remittance is Stoppable{
    using SafeMath for uint;

    struct Client {
        bytes32 secret; // For the password
        uint256 balances; // For storing bob's balance
        bool finished; // To check if the transaction is complete
        address exchange; // To store the particular exchange address
        address alice; // To store the remit initiator's address
        uint256 tillWhen; // To store till when this exchange is allowed
    }

    uint256 public ownerFees; // To store the owner collected fees

    mapping (address => Client) public bobDetails;
    mapping (address => uint256) public carolDetails; // To store the balance of the exchange owner

    event Remit(address indexed bob, address indexed carol, uint256 value);
    event OwnerCut(address indexed owner, uint256 value);
    event Transfered(address indexed to, uint256 value);
    event Exchange(address indexed from, address indexed to, uint256 value);
    event ClaimBack(address indexed to, uint256 value);

    constructor(bool initialRunState) public Stoppable(initialRunState){
    }

    function remit(bytes32 hashValue, address bobAddress, address carolAddress, uint256 till) public onlyIfRunning payable returns(bool status){

        // Address should be valid
        require(bobAddress != address(0), "Bob should be a valid address");
        require(carolAddress != address(0), "Carol should be a valid address");

        // To decrease the gas used
        uint msgValue = msg.value;

        // Minimum 1 wei should be sent.
        require(msgValue > 0, "Amount should be atleast 1 wei");

        // Owner taking his cut only if the transfer is more than 10,000 wei
        if (msg.value > 10000){
            ownerFees = ownerFees.add(100);
            msgValue = msgValue.sub(100);
        }

        // Details of Bob is updated
        bobDetails[bobAddress].secret = hashValue;
        bobDetails[bobAddress].balances = msgValue;
        bobDetails[bobAddress].exchange = carolAddress;
        bobDetails[bobAddress].tillWhen = now.add(till);
        bobDetails[bobAddress].alice = msg.sender;

        emit Remit(bobAddress, carolAddress, msgValue);

        return true;

    }

    function getBalanceOf(address check) public view returns(uint amount){

        return bobDetails[check].balances;

    }

    function exchange(address bobAddress, bytes32 bobSecret, bytes32 carolSecret) public onlyIfRunning returns(bool status){

        // Address should be valid
        require(bobAddress != address(0), "Bob should be a valid address");

        // As bob does not want to do anything with Ether, I am making Carol do the transfer
        // And only carol should be allowed to do this transfer
        require(bobDetails[bobAddress].exchange == msg.sender, "Only that particular exchange can do this");

        // To check the password
        bytes32 secret = keccak256(abi.encodePacked(bobSecret, carolSecret));
        require(secret == bobDetails[bobAddress].secret, "Password is incorrect.");

        uint bobBalance = bobDetails[bobAddress].balances;
        uint carolBalance = carolDetails[msg.sender];

        // This is to check whether the deadline is passed and Alice has taken the exchange amount back
        // Carol can also check getBalanceOf for this purpose
        require(bobBalance > 0, "Nothing to Withdraw");

        // As Bob receives fiat from Carol, Bob's balance is changed to zero
        // And Carol's balance is updated. Here we have updated considering that carol can be doing multiple exchanges as well
        bobDetails[bobAddress].balances = 0;
        carolDetails[msg.sender] = carolBalance.add(bobBalance);
        bobDetails[bobAddress].finished = true;

        emit Exchange(bobAddress, msg.sender, bobBalance);
        return true;

    }

    function withdraw(uint256 amount) public onlyIfRunning returns(bool status){

        require(amount > 0, "Zero cant be withdrawn");

        uint balance = carolDetails[msg.sender];
        require(balance >= amount, "Withdraw amount requested higher than balance");

        carolDetails[msg.sender] = balance.sub(amount);

        emit Transfered(msg.sender, amount);

        msg.sender.transfer(amount);
        return true;

    }

    function transferComplete(address check) public view returns(bool status){

        return bobDetails[check].finished;

    }

    function claimBack(address bobAddress, bytes32 bobSecret, bytes32 carolSecret) public onlyIfRunning returns(bool status){

        // Address should be valid
        require(bobAddress != address(0), "Bob should be a valid address");

        // To check the password
        bytes32 secret = keccak256(abi.encodePacked(bobSecret, carolSecret));
        require(secret == bobDetails[bobAddress].secret, "Password is incorrect.");

        // Only the remit creator should be allowed to claim back
        require(bobDetails[bobAddress].alice == msg.sender, "Only Alice can claim back");

        // This is to stop further checks if the exchange is already complete
        require(bobDetails[bobAddress].finished == false, "Exchange is already complete");

        // The claim period should start
        require(bobDetails[bobAddress].tillWhen < now, "Claim Period has not started yet");

        uint256 amount = bobDetails[bobAddress].balances;
        bobDetails[bobAddress].balances = 0;
        require(amount > 0, "Zero can't be withdrawn");

        emit ClaimBack(msg.sender, amount);

        msg.sender.transfer(amount);
        return true;

    }

    function ownerFeeTransfer(uint256 amount) public onlyIfRunning onlyOwner returns(bool status){

        require(amount > 0, "Zero cant be withdrawn");

        require(ownerFees >= amount, "Withdraw amount requested higher than balance");

        ownerFees = ownerFees.sub(amount);

        emit OwnerCut(msg.sender, amount);

        msg.sender.transfer(amount);
        return true;
    }

}
