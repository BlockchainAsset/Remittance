pragma solidity >=0.4.22 <0.6.0;

contract Owned {
    address payable private owner;

    event LogOwnerChanged(address indexed newOwner);

    modifier onlyOwner {
        require(owner == msg.sender, "Only owner can use this function");
        _;
    }

    constructor() public {
        owner = msg.sender;
    }

    function setOwner(address payable newOwner) public onlyOwner{
        require(newOwner != address(0), "newOwner should be a valid address");
        emit LogOwnerChanged(newOwner);
        owner = newOwner;
    }

    function getOwner() public view returns(address ownerAddress){
        return owner;
    }
}
