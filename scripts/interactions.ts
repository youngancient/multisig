import { ethers } from "hardhat";

async function main() {
  // get token address and contrat  

  const clownTokenAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const CTK = await ethers.getContractAt("IERC20", clownTokenAddress);

  //   get multisig factory address and contract
  const multisigFactoryAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const multisigFactory = await ethers.getContractAt(
    "MultisigFactory",
    multisigFactoryAddress
  );

  //   get signers
  const [owner, addr1, addr2, addr3, addr4, addr5, addr6] =
    await ethers.getSigners();

  // check the number of clones before creating one
  let numberOfClones = await multisigFactory.counter();
  console.log(
    "number of multisig clones before new clone creation: " + numberOfClones
  );

  //   create clone
  const quorum = 3;
  const validSigners = [
    addr1.address,
    addr2.address,
    addr3.address,
    addr4.address,
  ];
    const createMultiSigTx = await multisigFactory.createMultisigWallet(
      quorum,
      validSigners,
      owner.address
    );
    createMultiSigTx.wait();

    console.log("Clone multisig tx: ",createMultiSigTx);  // tx
  //   create multiple clones

  //   check the number of clones after creating
  numberOfClones = await multisigFactory.counter();
  console.log(
    "number of multisig clones after new clone creation: " + numberOfClones
  );

  //   console.log("transaction: ", createMultiSigTx);

  // get clone
  let cloneId = numberOfClones;

  const multiSigCloneAddress = await multisigFactory.getMultiSigClone(cloneId);
  //   returns the new multisig address
  console.log("New MultiSig wallet created at: ", multiSigCloneAddress);

  const MultiSig = await ethers.getContractAt("MultiSig", multiSigCloneAddress);
  //   check ERC20 balance before transfer
  let multiSigBal = await MultiSig.getContractERC20Balance(clownTokenAddress);
  console.log("MultiSig CTK Balance before transfer: ", multiSigBal);

  //   transfer token to MultiSig
  const amount = ethers.parseUnits("1000", 18);
  (await CTK.transfer(multiSigCloneAddress, amount)).wait();

  multiSigBal = await MultiSig.getContractERC20Balance(clownTokenAddress);
  console.log("MultiSig CTK Balance after transfer: ", multiSigBal);

  //   initiate transfer

    const transferAmount = ethers.parseUnits("1000", 18);
    const initiateTransferTx = await MultiSig.initiateTransfer(
      addr2.address,
      transferAmount,
      clownTokenAddress
    );
    initiateTransferTx.wait();

    console.log("Initiate transfer Tx: ",initiateTransferTx);        // tx

  console.log("No of transactions: ",await MultiSig.txCounter());

  // approve the initiated transaction
  let id = 1;
  const transferTrx = await MultiSig.transactions(id);
  console.log("no of Tx approval before: ",transferTrx.noOfApprovals);


  const approveTx = (await MultiSig.connect(addr2).approve(id)).wait();

  console.log("Approve transfer Tx: ", approveTx);

  console.log("no of Tx approval before: ",transferTrx.noOfApprovals);
  
  // initiate update Quorum

  //approve
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
