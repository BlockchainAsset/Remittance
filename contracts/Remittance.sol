pragma solidity >=0.4.22 <0.6.0;

import "./Stoppable.sol";
import "./SafeMath.sol";

contract Remittance is Stoppable{
    using SafeMath for uint;

    struct RemitDetails {
        uint256 amount; // For storing the amount of Remit
        bool finished; // To check if the transaction is complete
        address user; // To store the user address
        address exchange; // To store the particular exchange address
        address remitCreator; // To store the remit initiator's address
        uint256 deadline; // To store till when this exchange is allowed
    }

    uint256 public fee = 100; // Fee for each remittance valued more than 10K wei

    mapping (address => uint256) public ownerFees; // To store the owner collected fees
    mapping (bytes32 => RemitDetails) public remittances;
    mapping (address => uint256) public exchanger; // To store the balance of the exchange owner

    event Remit(address indexed user, address indexed exchanger, uint256 value);
    event OwnerCut(address indexed owner, uint256 value);
    event Transfered(address indexed exchanger, uint256 value);
    event Exchange(address indexed user, address indexed exchanger, uint256 value);
    event ClaimBack(address indexed remitCreator, uint256 value);

    constructor(bool initialRunState) public Stoppable(initialRunState){
    }

    function encrypt(bytes32 userSecret, bytes32 exchangerSecret) public pure returns(bytes32 password){
        return keccak256(abi.encodePacked(userSecret, exchangerSecret));
    }

    function remit(bytes32 hashValue, address userAddress, address exchangerAddress, uint256 deadline) public onlyIfRunning payable returns(bool status){

        // Address should be valid
        require(userAddress != address(0), "User address should be a valid address");
        require(exchangerAddress != address(0), "Exchanger address should be a valid address");

        // The hashValue should be unique
        require(remittances[hashValue].user == address(0), "The hashValue should be unique");

        // To decrease the gas used
        uint msgValue = msg.value;

        // Minimum 1 wei should be sent.
        require(msgValue > 0, "Amount should be atleast 1 wei");

        // Owner taking his cut only if the transfer is more than 10,000 wei
        if (msg.value > 10000){
            ownerFees[getOwner()] = ownerFees[getOwner()].add(fee);
            msgValue = msgValue.sub(fee);
        }

        // Details of Bob is updated
        remittances[hashValue].amount = msgValue;
        remittances[hashValue].user = userAddress;
        remittances[hashValue].exchange = exchangerAddress;
        remittances[hashValue].remitCreator = msg.sender;
        remittances[hashValue].deadline = now.add(deadline);

        emit Remit(userAddress, exchangerAddress, msgValue);

        return true;

    }

    function exchange(address userAddress, bytes32 userSecret, bytes32 exchangerSecret) public onlyIfRunning returns(bool status){

        // Address should be valid
        require(userAddress != address(0), "User address should be a valid address");

        bytes32 secret = encrypt(userSecret, exchangerSecret);

        // As User does not want to do anything with Ether, I am making Exchanger to do the transfer
        // And only Exchanger should be allowed to do this transfer
        require(remittances[secret].exchange == msg.sender, "Only that particular exchange can do this");

        // This is just an extra precaution because we are using a hashValue as the mapping
        require(remittances[secret].user == userAddress, "Only that particular Users exchange should be done by the Exchanger");

        uint userBalance = remittances[secret].amount;
        uint exchangerBalance = exchanger[msg.sender];

        // This is to check whether the deadline is passed and Remit Creator has taken the exchange amount back
        // Exchanger can also check getBalanceOf for this purpose
        require(userBalance > 0, "Nothing to Withdraw");

        // As User receives fiat from Exchanger, User's balance is changed to zero
        // And Exchanger's balance is updated. Here we have updated considering that carol can be doing multiple exchanges as well
        remittances[secret].amount = 0;
        exchanger[msg.sender] = exchangerBalance.add(userBalance);
        remittances[secret].finished = true;

        emit Exchange(userAddress, msg.sender, userBalance);
        return true;

    }

    function withdraw(uint256 amount) public onlyIfRunning returns(bool status){

        require(amount > 0, "Zero cant be withdrawn");

        uint balance = exchanger[msg.sender];
        require(balance >= amount, "Withdraw amount requested higher than balance");

        exchanger[msg.sender] = balance.sub(amount);

        emit Transfered(msg.sender, amount);

        msg.sender.transfer(amount);
        return true;

    }

    function claimBack(address userAddress, bytes32 userSecret, bytes32 exchangerSecret) public onlyIfRunning returns(bool status){

        // Address should be valid
        require(userAddress != address(0), "User address should be a valid address");

        bytes32 secret = encrypt(userSecret, exchangerSecret);

        // Only the Remit Creator should be allowed to claim back
        require(remittances[secret].remitCreator == msg.sender, "Only Remit Creator can claim back");

        // This is to stop further checks if the exchange is already complete
        require(remittances[secret].finished == false, "Exchange is already complete");

        // The claim period should start
        require(remittances[secret].deadline < now, "Claim Period has not started yet");

        uint256 amount = remittances[secret].amount;
        require(amount > 0, "Zero can't be withdrawn");

        remittances[secret].amount = 0;

        emit ClaimBack(msg.sender, amount);

        msg.sender.transfer(amount);
        return true;

    }

    function ownerFeeTransfer(uint256 amount) public onlyIfRunning onlyOwner returns(bool status){

        require(amount > 0, "Zero cant be withdrawn");

        require(ownerFees[msg.sender] >= amount, "Withdraw amount requested higher than balance");

        ownerFees[msg.sender] = ownerFees[msg.sender].sub(amount);

        emit OwnerCut(msg.sender, amount);

        msg.sender.transfer(amount);
        return true;
    }

}
