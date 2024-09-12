// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./MultiSig.sol";

// is it possible to write the factory contract with mapping?

// using mapping
contract MultisigFactory {
    uint public counter;
    // define the array that holds different multisig contracts
    mapping(uint => MultiSig) multisigClones;

    function createMultisigWallet(
        uint256 _quorum,
        address[] memory _validSigners,
        address _deployer
    ) external returns (MultiSig newMulsig_) {
        newMulsig_ = new MultiSig(_quorum, _validSigners, _deployer);
        counter += 1;
        multisigClones[counter] = newMulsig_;
    }

    function getMultiSigClone(uint256 _id) external view returns (MultiSig) {
        // add a check that prevents invalid lookup
        return multisigClones[_id];
    }
}
// using array
// contract MultisigFactory {

//     // define the array that holds different multisig contracts
//     MultiSig[] multisigClones;

//     function createMultisigWallet(uint256 _quorum, address[] memory _validSigners) external returns (MultiSig newMulsig_, uint256 length_) {

//         newMulsig_ = new MultiSig(_quorum, _validSigners);

//         multisigClones.push(newMulsig_);

//         length_ = multisigClones.length;
//     }

//     function getMultiSigClones() external view returns(MultiSig[] memory) {
//         return multisigClones;
//     }

// }
