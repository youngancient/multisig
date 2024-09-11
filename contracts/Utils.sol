// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

// error library
library Errors {
    error NotAValidSigner();
    error ValidSignerExistsAlready();
    error ValidSignersTooFew();
    error QuorumTooSmall();
    error ZeroAddressNotAllowed();
    error ZeroValueNotAllowed();
    error InSufficientTokenBalance();
    error InvalidTransaction();
    error TransactionApprovedAlready();
    error CantSignTransactionTwice();
    error QuorumCannotBeMoreThanValidSigners();
    error TransactionCompletedAlready();
}

// events library
library MyEvents {
    event TransferInitiated(
        address indexed _sender,
        address indexed _to,
        uint indexed _amount
    );
    event WithdrawalInitiated(
        address indexed _sender,
        address indexed _to,
        uint indexed _amount
    );
    event UpdateQuorumInitiated(
        address indexed _sender,
        uint indexed _newQuorum
    );
    event UpdateValidSignersInitiated(
        address indexed _sender,
        address indexed _newValidSigner
    );

    event TransactionApproved();

    event TransactionCompleted(
        address indexed _sender,
        address indexed _to,
        uint indexed _amount
    );
     event QuorumUpdateSuccessful(
        address indexed _sender,
        uint indexed _newQuorum
    );
     event ValidSignersUpdateSuccessful(
        address indexed _sender,
        address indexed _newValidSigner
    );
}
