import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { token } from "../typechain-types/@openzeppelin/contracts";
import { ZeroAddress } from "ethers";

describe("MultiSig Contract", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployToken() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await hre.ethers.getSigners();
    // token we are using to test
    const erc20Token = await hre.ethers.getContractFactory("ClownToken");
    const token = await erc20Token.deploy();

    return { token };
  }

  async function deployMultiSig() {
    // Contracts are deployed using the first signer/account by default
    const [owner, addr1, addr2, addr3, addr4, addr5, addr6] =
      await hre.ethers.getSigners();

    const { token } = await loadFixture(deployToken);

    const multiSIG = await hre.ethers.getContractFactory("MultiSig");

    const validSigners = [
      owner.address,
      addr1.address,
      addr2.address,
      addr3.address,
      addr4.address,
    ];
    const quorum = 3;

    const multiSig = await multiSIG.deploy(quorum, validSigners);

    return {
      multiSig,
      owner,
      addr1,
      addr2,
      addr3,
      addr4,
      addr5,
      addr6,
      token,
      quorum,
      validSigners,
    };
  }

  describe("Deployment", function () {
    //"Should check that deployment fails if the quorum is greater than the noOfValidSigners "
    it("Should set the correct quorum ", async function () {
      const { multiSig, owner, quorum, validSigners } = await loadFixture(
        deployMultiSig
      );
      expect(await multiSig.quorum()).to.equal(quorum);
      expect(await multiSig.noOfValidSigners()).to.equal(validSigners.length);
    });

    it("Should set all the addresses passed in as valid signers including the deployer", async function () {
      const { multiSig, owner, addr1, addr2, addr3, addr4 } = await loadFixture(
        deployMultiSig
      );
      expect(await multiSig.validSigners(owner.address)).to.equal(true);
      expect(await multiSig.validSigners(addr1.address)).to.equal(true);
      expect(await multiSig.validSigners(addr2.address)).to.equal(true);
      expect(await multiSig.validSigners(addr3.address)).to.equal(true);
      expect(await multiSig.validSigners(addr4.address)).to.equal(true);
    });

    it("Should set the actual number of valid signers", async function () {
      const { multiSig, owner, quorum, validSigners } = await loadFixture(
        deployMultiSig
      );
      expect(await multiSig.noOfValidSigners()).to.equal(validSigners.length);
    });
  });

  describe("Initiate Transfer", function () {
    //"Should check that deployment fails if the quorum is greater than the noOfValidSigners "
    it("Should revert on zero transfer", async function () {
      const { multiSig, owner, addr1, token, quorum, validSigners } =
        await loadFixture(deployMultiSig);
      const amount = ethers.parseUnits("0", 18);
      await expect(
        multiSig.initiateTransfer(addr1.address, amount, token)
      ).to.be.revertedWithCustomError(multiSig, "ZeroValueNotAllowed");
    });

    it("Should revert if receiver is zero address", async function () {
      const { multiSig, owner, addr1, token, quorum, validSigners } =
        await loadFixture(deployMultiSig);
      const amount = ethers.parseUnits("100", 18);

      await expect(
        multiSig.initiateTransfer(ZeroAddress, amount, token)
      ).to.be.revertedWithCustomError(multiSig, "ZeroAddressNotAllowed");
    });

    it("Should initiate transaction successfully", async function () {
      const { multiSig, owner, addr1, token, quorum, validSigners } =
        await loadFixture(deployMultiSig);
      const amount = ethers.parseUnits("100", 18);
      const txCount = 1;
      await multiSig.initiateTransfer(addr1.address, amount, token);
      expect(await multiSig.txCounter()).to.equal(txCount);
      const tx = await multiSig.transactions(txCount);
      expect(tx.id).to.equal(txCount);
      expect(tx.sender).to.equal(owner);
      expect(tx.tokenAddress).to.equal(token);
      expect(tx.receiver).to.equal(addr1.address);
      expect(tx.amount).to.equal(amount);
      expect(tx.isCompleted).to.equal(false);
    });
  });

  describe("Initiate Withdraw", function () {
    //"Should check that deployment fails if the quorum is greater than the noOfValidSigners "
    it("Should revert on zero transfer", async function () {
      const { multiSig, owner, addr1, token, quorum, validSigners } =
        await loadFixture(deployMultiSig);
      const amount = ethers.parseUnits("0", 18);
      await expect(
        multiSig.initiateWithdraw(amount, token)
      ).to.be.revertedWithCustomError(multiSig, "ZeroValueNotAllowed");
    });

    it("Should initiate transaction successfully", async function () {
      const { multiSig, owner, addr1, token, quorum, validSigners } =
        await loadFixture(deployMultiSig);
      const amount = ethers.parseUnits("100", 18);
      const txCount = 1;

      const contractAddress = await multiSig.getAddress();

      await multiSig.initiateWithdraw(amount, token);
      expect(await multiSig.txCounter()).to.equal(txCount);

      const tx = await multiSig.transactions(txCount);
      expect(tx.id).to.equal(txCount);
      expect(tx.sender).to.equal(contractAddress);
      expect(tx.tokenAddress).to.equal(token);
      expect(tx.receiver).to.equal(owner);
      expect(tx.amount).to.equal(amount);
      expect(tx.isCompleted).to.equal(false);
    });
  });

  describe("Approve Transfer", function () {
    //"Should check that deployment fails if the quorum is greater than the noOfValidSigners "
    it("Should revert on invalid transfer id", async function () {
      const { multiSig, owner, addr1 } = await loadFixture(deployMultiSig);
      const invalidTxId = 2;
      await expect(
        multiSig.connect(addr1).approve(invalidTxId)
      ).to.be.revertedWithCustomError(multiSig, "InvalidTransaction");
    });

    it("Should revert on invalid signer", async function () {
      const { multiSig, owner, addr1, addr5 } = await loadFixture(
        deployMultiSig
      );
      const txId = 1;
      await expect(
        multiSig.connect(addr5).approve(txId)
      ).to.be.revertedWithCustomError(multiSig, "NotAValidSigner");
    });

    it("Should not approve transaction twice", async function () {
      const { multiSig, owner, token, addr1, addr5 } = await loadFixture(
        deployMultiSig
      );
      const amount = ethers.parseUnits("100", 18);
      // owner initiates a transfer to addr1
      await multiSig.initiateTransfer(addr1.address, amount, token);

      const txId = 1;

      await expect(
        multiSig.connect(owner).approve(txId)
      ).to.be.revertedWithCustomError(multiSig, "CantSignTransactionTwice");
    });

    it("Should approve a transaction successfully", async function () {
      const { multiSig, owner, token, addr1, addr5 } = await loadFixture(
        deployMultiSig
      );
      const amount = ethers.parseUnits("100", 18);
      // owner initiates a transfer to addr1
      await multiSig.initiateTransfer(addr1.address, amount, token);

      const txCount = 1;
      const txId = 1;

      await multiSig.connect(addr1).approve(txId);

      await expect((await multiSig.transactions(txId)).noOfApprovals).to.equal(
        txCount + 1
      );
    });

    it("Should execute a transfer transaction successfully if quorum is reached", async function () {
      const { multiSig, owner, token, addr1, addr2, addr3, addr4 } =
        await loadFixture(deployMultiSig);
      // deposit tokens to the contract
      const depositAmount = ethers.parseUnits("1000", 18);
      const contractAddress = await multiSig.getAddress();

      const userBalanceBefore = await token.balanceOf(addr1.address);

      // transfers token to contract
      await token.transfer(contractAddress, depositAmount);

      const contractBalanceBeforeTransfer = await token.balanceOf(
        contractAddress
      );

      const transferAmount = ethers.parseUnits("100", 18);

      // owner initiates a transfer to addr1
      await multiSig.initiateTransfer(addr1.address, transferAmount, token);

      const txId = 1;

      await multiSig.connect(addr1).approve(txId);
      await multiSig.connect(addr2).approve(txId);

      const quorum = await multiSig.quorum();

      const tx = await multiSig.transactions(txId);

      // we expect the quorum to have been reached
      await expect(tx.noOfApprovals).to.equal(quorum);

      // we expect the transaction to be complete
      expect(tx.isCompleted).to.equal(true);
    });
  });

  describe("Initiate Update Quorum", function () {
    //"Should check that deployment fails if the quorum is greater than the noOfValidSigners "
    it("Should revert if newQuorum is zero", async function () {
      const { multiSig, owner, addr1, token, quorum, validSigners } =
        await loadFixture(deployMultiSig);
      const newQuorum = 0;
      await expect(
        multiSig.initiateUpdateQuorum(newQuorum)
      ).to.be.revertedWithCustomError(multiSig, "ZeroValueNotAllowed");
    });

    it("Should revert if newQuorum is less than or equals 1", async function () {
      const { multiSig, owner, addr1, token, quorum, validSigners } =
        await loadFixture(deployMultiSig);
      const newQuorum = 1;
      await expect(
        multiSig.initiateUpdateQuorum(newQuorum)
      ).to.be.revertedWithCustomError(multiSig, "QuorumTooSmall");
    });

    it("Should revert if called by a nonValid signer", async function () {
      const { multiSig, owner, addr5, token, quorum, validSigners } =
        await loadFixture(deployMultiSig);
      const newQuorum = 4;
      await expect(
        multiSig.connect(addr5).initiateUpdateQuorum(newQuorum)
      ).to.be.revertedWithCustomError(multiSig, "NotAValidSigner");
    });

    it("Should revert if newQuorum is higher than number of valid signers", async function () {
      const { multiSig, owner, addr5, token, quorum, validSigners } =
        await loadFixture(deployMultiSig);
      const newQuorum = 10;
      await expect(
        multiSig.initiateUpdateQuorum(newQuorum)
      ).to.be.revertedWithCustomError(
        multiSig,
        "QuorumCannotBeMoreThanValidSigners"
      );
    });

    it("Should initiate Quorum update transaction successfully", async function () {
      const { multiSig, owner, addr1, token, quorum, validSigners } =
        await loadFixture(deployMultiSig);
      const amount = ethers.parseUnits("100", 18);
      const txCount = 1;

      const contractAddress = await multiSig.getAddress();

      const newQuorum = 4;

      await multiSig.initiateUpdateQuorum(newQuorum);
      expect(await multiSig.txCounter()).to.equal(txCount);

      const tx = await multiSig.transactions(txCount);
      expect(tx.id).to.equal(txCount);
      expect(tx.sender).to.equal(owner);
      expect(tx.tokenAddress).to.equal(ZeroAddress);
      expect(tx.receiver).to.equal(contractAddress);
      expect(tx.amount).to.equal(newQuorum);
      expect(tx.isCompleted).to.equal(false);
    });
  });

  describe("Initiate Update Valid Signers", function () {
    //"Should check that deployment fails if the quorum is greater than the noOfValidSigners "
    it("Should revert if newSigner is Zero Address", async function () {
      const { multiSig, owner, addr1, token, quorum, validSigners } =
        await loadFixture(deployMultiSig);
      const newValidSigner = ZeroAddress;
      await expect(
        multiSig.initiateUpdateValidSigners(newValidSigner)
      ).to.be.revertedWithCustomError(multiSig, "ZeroAddressNotAllowed");
    });

    it("Should revert if called by an invalid signer", async function () {
      const {
        multiSig,
        owner,
        addr1,
        addr5,
        addr6,
        token,
        quorum,
        validSigners,
      } = await loadFixture(deployMultiSig);
      const newValidSigner = addr6;
      await expect(
        multiSig.connect(addr5).initiateUpdateValidSigners(newValidSigner)
      ).to.be.revertedWithCustomError(multiSig, "NotAValidSigner");
    });

    it("Should initiate ValidSigners update transaction successfully", async function () {
      const { multiSig, owner, addr1, addr6, token, quorum, validSigners } =
        await loadFixture(deployMultiSig);

      const txCount = 1;

      const newValidSigner = addr6;

      await multiSig.initiateUpdateValidSigners(newValidSigner);
      expect(await multiSig.txCounter()).to.equal(txCount);

      const tx = await multiSig.transactions(txCount);
      expect(tx.id).to.equal(txCount);
      expect(tx.sender).to.equal(owner);
      expect(tx.tokenAddress).to.equal(ZeroAddress);
      expect(tx.receiver).to.equal(newValidSigner);
      expect(tx.amount).to.equal(0);
      expect(tx.isCompleted).to.equal(false);
    });
  });
});
