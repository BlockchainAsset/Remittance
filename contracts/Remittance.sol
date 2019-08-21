pragma solidity >=0.4.22 <0.6.0;

import "./Stoppable.sol";
import "./SafeMath.sol";

contract Remittance is Stoppable{
    using SafeMath for uint;

    struct RemitDetails {
        uint256 amount; // For storing the amount of Remit
        address remitCreator; // To store the remit initiator's address
        uint256 deadline; // To store in seconds from the current time for the claim back to start
    }

    uint256 public feeThreshold; // Fee would be taken once the remittance is valued more than 10K wei
    uint256 public fee; // Fee for each remittance valued more than 10K wei

    mapping (address => uint256) public balances; // To store the contract owner & exchange owner balance
    mapping (bytes32 => RemitDetails) public remittances;

    event Remit(bytes32 indexed hashValue, address indexed remitCreator, uint256 value);
    event Withdrawed(address indexed to, uint256 value);
    event Exchange(bytes32 indexed hashValue, address indexed exchanger, uint256 value);
    event ClaimBack(bytes32 indexed hashValue, address indexed remitCreator, uint256 value);

    constructor(bool initialRunState) public Stoppable(initialRunState){
        feeThreshold = 10000;
        fee = 100;
    }

    function encrypt(bytes32 userSecret, address exchangerAddress) public view returns(bytes32 password){

        require(exchangerAddress != address(0), "Exchanger address should be a valid address");
        return keccak256(abi.encodePacked(userSecret, exchangerAddress, address(this)));

    }

    function remit(bytes32 hashValue, uint256 second) public onlyIfRunning payable returns(bool status){

        // The hashValue should be unique
        require(remittances[hashValue].remitCreator == address(0), "The hashValue should be unique");

        // To decrease the gas used
        uint msgValue = msg.value;

        // Minimum 1 wei should be sent.
        require(msgValue > 0, "Amount should be atleast 1 wei");

        // Owner taking his cut only if the transfer is more than 10,000 wei
        if (msg.value > feeThreshold){
            address ownerAddress = getOwner();
            balances[ownerAddress] = balances[ownerAddress].add(fee);
            msgValue = msgValue.sub(fee);
        }

        // Details of Bob is updated
        remittances[hashValue].amount = msgValue;
        remittances[hashValue].remitCreator = msg.sender;
        remittances[hashValue].deadline = now.add(second);

        emit Remit(hashValue, msg.sender, msgValue);

        return true;

    }

    function exchange(bytes32 userSecret) public onlyIfRunning returns(bool status){

        bytes32 hashValue = encrypt(userSecret, msg.sender);

        uint userBalance = remittances[hashValue].amount;

        // This is to check whether the deadline is passed and Remit Creator has taken the exchange amount back
        require(userBalance > 0, "Remittance Completed/Claimed Back.");

        // As User receives fiat from Exchanger, User's balance is changed to zero
        // And Exchanger's balance is updated. Here we have updated considering that carol can be doing multiple exchanges as well
        remittances[hashValue].amount = 0;
        remittances[hashValue].deadline = 0; // To shrink the data use
        balances[msg.sender] = balances[msg.sender].add(userBalance);

        emit Exchange(hashValue, msg.sender, userBalance);
        return true;

    }

    function withdraw(uint256 amount) public onlyIfRunning returns(bool status){

        require(amount > 0, "Zero cant be withdrawn");

        uint balance = balances[msg.sender];
        //require(balance >= amount, "Withdraw amount requested higher than balance");
        // Commented because the next line will revert if amount is a value greater than balance

        balances[msg.sender] = balance.sub(amount);

        emit Withdrawed(msg.sender, amount);

        msg.sender.transfer(amount);
        return true;

    }

    function claimBack(bytes32 hashValue) public onlyIfRunning returns(bool status){

        // Only the Remit Creator should be allowed to claim back
        require(remittances[hashValue].remitCreator == msg.sender, "Only Remit Creator can claim back");

        // This is to stop further checks if the exchange is already complete
        uint256 amount = remittances[hashValue].amount;
        require(amount > 0, "Exchange is already complete");

        // The claim period should start
        require(remittances[hashValue].deadline < now, "Claim Period has not started yet");

        remittances[hashValue].amount = 0;

        emit ClaimBack(hashValue, msg.sender, amount);

        msg.sender.transfer(amount);
        return true;

    }

}
