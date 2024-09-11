// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

// Uncomment this line to use console.log
// import "hardhat/console.sol";
import "./Utils.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract MultiSig is ReentrancyGuard {
    uint8 public quorum; // remove public
    uint8 public noOfValidSigners; // remove public
    uint256 public txCounter; // remove public

    enum TxType {
        TransferValue,
        UpdateQuorum,
        UpdateValidSigners
    }

    // remove public
    mapping(address => bool) public validSigners; // maps signer addres -> bool

    // maps signer address to a mapping of transactionId and signedState
    // hasSignedTransaction[signer][transactionId] -> bool
    mapping(address => mapping(uint => bool)) public hasUserSignedTransaction; // remove public

    // checks
    function sanityCheck(address _user) private pure {
        if (_user == address(0)) {
            revert Errors.ZeroAddressNotAllowed();
        }
    }

    function zeroValueCheck(uint256 _value) private pure {
        if (_value == 0) {
            revert Errors.ZeroValueNotAllowed();
        }
    }

    // checks if a signer has signed a transaction with transactionId
    function hasSignedTransaction(
        address _user,
        uint _transactionId
    ) private view returns (bool) {
        sanityCheck(_user);
        return hasUserSignedTransaction[_user][_transactionId];
    }

    // checks the balance of ERC20 token deployed at tokenAddress
    function getContractERC20Balance(
        address _tokenAddress
    ) public view returns (uint) {
        sanityCheck(_tokenAddress);
        return IERC20(_tokenAddress).balanceOf(address(this));
    }

    constructor(uint8 _quorum, address[] memory _validSigners) {
        if (_validSigners.length < 1) {
            revert Errors.ValidSignersTooFew();
        }

        if (_quorum < 1) {
            revert Errors.QuorumTooSmall();
        }

        // loops through the list of addresses passed in by the deployer and sets them as valid signers

        for (uint i; i < _validSigners.length; i++) {
            sanityCheck(_validSigners[i]);
            if (validSigners[_validSigners[i]]) {
                revert Errors.ValidSignerExistsAlready();
            }
            validSigners[_validSigners[i]] = true;
        }

        noOfValidSigners = uint8(_validSigners.length);

        // checks if the deployer is a valid signer and adds his address
        if (!validSigners[msg.sender]) {
            validSigners[msg.sender] = true;
            noOfValidSigners += 1;
        }

        // check that the quorum is less than or equals the validSigners length
        // revert if not
        if (_quorum > noOfValidSigners) {
            revert Errors.QuorumCannotBeMoreThanValidSigners();
        }
        quorum = _quorum; // sets the quorum
    }

    struct Transaction {
        uint256 id;
        bool isCompleted;
        uint8 noOfApprovals;
        address sender;
        address receiver;
        address tokenAddress;
        uint256 timestamp;
        uint256 amount;
        address[] transactionSigners;
        TxType transactionType;
    }
    // change back to internal
    mapping(uint => Transaction) public transactions;

    function initiateTransfer(
        address _receiver,
        uint256 _amount,
        address _tokenAddress
    ) external {
        sanityCheck(msg.sender);
        sanityCheck(_receiver);
        sanityCheck(_tokenAddress);
        zeroValueCheck(_amount);

        // checks if msg.sender is a valid signer
        if (!validSigners[msg.sender]) {
            revert Errors.NotAValidSigner();
        }

        uint _id = txCounter + 1;

        Transaction storage trx = transactions[_id];
        trx.amount = _amount;
        trx.id = _id;
        trx.sender = msg.sender;
        trx.tokenAddress = _tokenAddress;
        trx.receiver = _receiver;
        trx.timestamp = block.timestamp;
        trx.isCompleted = false;
        trx.transactionType = TxType.TransferValue;
        trx.noOfApprovals += 1;
        // To ensure that the person who creates the transaction cannot sign again
        // this is because by initiating the transaction, he is an approver by default
        hasUserSignedTransaction[msg.sender][_id] = true;
        trx.transactionSigners.push(msg.sender);

        txCounter += 1;

        emit MyEvents.TransferInitiated(msg.sender, _receiver, _amount);
    }

    function _transfer(
        address _receiver,
        uint _value,
        address _tokenAddress
    ) private {
        IERC20(_tokenAddress).transfer(_receiver, _value);
        emit MyEvents.TransactionCompleted(msg.sender, _receiver, _value);
    }

    function _updateValidSigners(address _newValidSigner) private {
        validSigners[_newValidSigner] = true;
        noOfValidSigners += 1;
        emit MyEvents.ValidSignersUpdateSuccessful(msg.sender, _newValidSigner);
    }

    function _updateQuorum(uint8 _quorum) private {
        zeroValueCheck(_quorum);
        if (_quorum > noOfValidSigners) {
            revert Errors.QuorumCannotBeMoreThanValidSigners();
        }
        quorum = _quorum;
        emit MyEvents.QuorumUpdateSuccessful(msg.sender, _quorum);
    }

    function approve(uint _transactionId) external nonReentrant {
        // @dev : CHECKS

        // sanity check
        sanityCheck(msg.sender);

        // checks if msg.sender is a valid signer
        if (!validSigners[msg.sender]) {
            revert Errors.NotAValidSigner();
        }

        // check if transaction is valid
        if (transactions[_transactionId].id == 0) {
            revert Errors.InvalidTransaction();
        }

        // check that someone who has approved before doesnt approve again
        if (hasSignedTransaction(msg.sender, _transactionId)) {
            revert Errors.CantSignTransactionTwice();
        }

        Transaction storage trx = transactions[_transactionId];

        if(trx.isCompleted){
            revert Errors.TransactionCompletedAlready();
        }

        // @dev : EFFECTS
        hasUserSignedTransaction[msg.sender][_transactionId] = true;
        trx.noOfApprovals += 1;
        trx.transactionSigners.push(msg.sender);

        // check the type of transaction
        if (trx.transactionType == TxType.TransferValue) {
            if (trx.noOfApprovals == quorum) {
                if (getContractERC20Balance(trx.tokenAddress) < trx.amount) {
                    revert Errors.InSufficientTokenBalance();
                }
                trx.isCompleted = true;

                // @dev : INTERACTION
                _transfer(trx.receiver, trx.amount, trx.tokenAddress);
            }

        } else if (trx.transactionType == TxType.UpdateQuorum) {
            if (trx.noOfApprovals == quorum) {
                trx.isCompleted = true;

                // calls the update function. this function carries out the necessary checks
                // @dev : INTERACTION
                _updateQuorum(uint8(trx.amount));
            }
        } else if (trx.transactionType == TxType.UpdateValidSigners) {
            if (trx.noOfApprovals == quorum) {
                trx.isCompleted = true;

                // the receiver in this case the the address of the newSigner to be added
                // @dev : INTERACTION
                _updateValidSigners(trx.receiver);
            }
        }
    }

    function initiateWithdraw(uint256 _amount, address _tokenAddress) external {
        sanityCheck(msg.sender);
        sanityCheck(_tokenAddress);
        zeroValueCheck(_amount);

        // checks if msg.sender is a valid signer
        if (!validSigners[msg.sender]) {
            revert Errors.NotAValidSigner();
        }

        uint _id = txCounter + 1;

        Transaction storage trx = transactions[_id];
        trx.amount = _amount;
        trx.id = _id;
        trx.sender = address(this);
        trx.tokenAddress = _tokenAddress;
        trx.receiver = msg.sender;
        trx.timestamp = block.timestamp;
        trx.isCompleted = false;
        trx.transactionType = TxType.TransferValue;
        trx.noOfApprovals += 1;
        // To ensure that the person who creates the transaction cannot sign again
        // this is because by initiating the transaction, he is an approver by default
        hasUserSignedTransaction[msg.sender][_id] = true;
        trx.transactionSigners.push(msg.sender);

        txCounter += 1;

        emit MyEvents.WithdrawalInitiated(address(this), msg.sender, _amount);
    }

    function initiateUpdateQuorum(uint256 _newQuorum) external {
        sanityCheck(msg.sender);
        zeroValueCheck(_newQuorum);

        if(_newQuorum <= 1){
            revert Errors.QuorumTooSmall();
        }

        // checks if the newQuorum is less than or equal to the noOfVAlidSigners
        if (_newQuorum > noOfValidSigners) {
            revert Errors.QuorumCannotBeMoreThanValidSigners();
        }
        // checks if msg.sender is a valid signer
        if (!validSigners[msg.sender]) {
            revert Errors.NotAValidSigner();
        }

        uint _id = txCounter + 1;

        Transaction storage trx = transactions[_id];
        trx.amount = _newQuorum; // the amount here in the tx is assigned to the newQuorum value
        trx.id = _id;
        trx.sender = msg.sender;
        trx.tokenAddress = address(0); // doing this because we don't need it
        trx.receiver = address(this);
        trx.timestamp = block.timestamp;
        trx.isCompleted = false;
        trx.transactionType = TxType.UpdateQuorum;
        trx.noOfApprovals += 1;

        // To ensure that the person who creates the transaction cannot sign again
        // this is because by initiating the transaction, he is an approver by default
        hasUserSignedTransaction[msg.sender][_id] = true;
        trx.transactionSigners.push(msg.sender);

        txCounter += 1;
        emit MyEvents.UpdateQuorumInitiated(msg.sender, _newQuorum);
    }

    function initiateUpdateValidSigners(address _newValidSigner) external {
        sanityCheck(msg.sender);
        sanityCheck(_newValidSigner);

        // checks if msg.sender is a valid signer
        if (!validSigners[msg.sender]) {
            revert Errors.NotAValidSigner();
        }

        uint _id = txCounter + 1;

        Transaction storage trx = transactions[_id];
        trx.amount = 0; // the amount here in the tx is assigned to zero
        trx.id = _id;
        trx.sender = msg.sender;
        trx.tokenAddress = address(0); // doing this because we don't need it
        trx.receiver = _newValidSigner; // the receiver is set as the newValidSigner
        trx.timestamp = block.timestamp;
        trx.isCompleted = false;
        trx.transactionType = TxType.UpdateValidSigners;
        trx.noOfApprovals += 1;

        // To ensure that the person who creates the transaction cannot sign again
        // this is because by initiating the transaction, he is an approver by default
        hasUserSignedTransaction[msg.sender][_id] = true;
        trx.transactionSigners.push(msg.sender);

        txCounter += 1;
        emit MyEvents.UpdateValidSignersInitiated(msg.sender, _newValidSigner);
    }
}
