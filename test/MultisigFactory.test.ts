import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { ZeroAddress } from "ethers";

describe("MultiSigFactory Contract", function () {
  async function deployMultiSigFactory() {
    const [owner, addr1, addr2, addr3, addr4, addr5, addr6] =
      await hre.ethers.getSigners();
    const multisigFactoryF = await hre.ethers.getContractFactory(
      "MultisigFactory"
    );

    const multisigFactory = await multisigFactoryF.deploy();

    //const multiSig = await hre.ethers.getContractFactory("MultiSig");

    return {
      multisigFactory,
      owner,
      addr1,
      addr2,
      addr3,
      addr4,
      addr5,
      addr6,
    };
  }
  describe("Deployment", function () {
    //"Should check that deployment fails if the quorum is greater than the noOfValidSigners "
    it("Should be deployed successfully ", async function () {
      const { multisigFactory, owner, addr1 } = await loadFixture(
        deployMultiSigFactory
      );
      // we count the number of clones after deployment
      const counter = await multisigFactory.counter();
      // we expect it to be zero
      expect(counter).to.equal(0);
    });
  });

  describe("Create MultiSig Wallet", function () {
    it("Should create MultiSig wallet successfully ", async function () {
      const { multisigFactory, owner, addr1, addr2, addr3, addr4 } =
        await loadFixture(deployMultiSigFactory);
      const validSigners = [
        addr1.address,
        addr2.address,
        addr3.address,
        addr4.address,
      ];
      const quorum = 3;
      // adds owner to the constructor
      await multisigFactory.createMultisigWallet(
        quorum,
        validSigners,
        owner.address
      );

      const counter = await multisigFactory.counter();

      expect(counter).to.equal(1);
    });
    it("Should add owner automatically when creating MultiSig wallet ", async function () {
      const { multisigFactory, owner, addr1, addr2, addr3, addr4 } =
        await loadFixture(deployMultiSigFactory);
      const validSigners = [
        addr1.address,
        addr2.address,
        addr3.address,
        addr4.address,
      ];
      const quorum = 3;
      await multisigFactory.createMultisigWallet(
        quorum,
        validSigners,
        owner.address
      );

      const multiSigCloneAddress = await multisigFactory.getMultiSigClone(1);
      const MultiSig = await ethers.getContractAt(
        "MultiSig",
        multiSigCloneAddress
      );

      expect(await MultiSig.validSigners(owner.address)).to.equal(true);
    });
    it("Should create Multiple MultiSig wallets successfully ", async function () {
      const { multisigFactory, owner, addr1, addr2, addr3, addr4, addr5 } =
        await loadFixture(deployMultiSigFactory);
      // wallet 1
      const validSigners1 = [
        addr1.address,
        addr2.address,
        addr3.address,
        addr4.address,
      ];
      const quorum1 = 3;
      await multisigFactory.createMultisigWallet(
        quorum1,
        validSigners1,
        owner.address
      );

      // wallet2
      const validSigners2 = [
        owner.address,
        addr1.address,
        addr2.address,
        addr3.address,
        addr5.address,
      ];
      const quorum2 = 3;
      await multisigFactory.createMultisigWallet(
        quorum2,
        validSigners2,
        owner.address
      );

      // wallet3
      const validSigners3 = [
        addr1.address,
        addr2.address,
        addr3.address,
        addr5.address,
      ];
      const quorum3 = 3;
      await multisigFactory.createMultisigWallet(
        quorum3,
        validSigners3,
        owner.address
      );

      const counter = await multisigFactory.counter();

      expect(counter).to.equal(3);
    });
  });

  // describe("Create MultiSig Wallet", function () {
  //   it("Should create MultiSig wallet successfully ", async function () {
  //     const { multisigFactory, owner, addr1, addr2, addr3, addr4 } =
  //       await loadFixture(deployMultiSigFactory);
  //     const validSigners = [
  //       owner.address,
  //       addr1.address,
  //       addr2.address,
  //       addr3.address,
  //       addr4.address,
  //     ];
  //     const quorum = 3;
  //     await multisigFactory.createMultisigWallet(quorum, validSigners);

  //     expect((await multisigFactory.getMultiSigClones()).length).to.equal(1);
  //   });
  //   it("Should create Multiple MultiSig wallets successfully ", async function () {
  //     const { multisigFactory, owner, addr1, addr2, addr3, addr4, addr5 } =
  //       await loadFixture(deployMultiSigFactory);
  //     // wallet 1
  //     const validSigners1 = [
  //       owner.address,
  //       addr1.address,
  //       addr2.address,
  //       addr3.address,
  //       addr4.address,
  //     ];
  //     const quorum1 = 3;
  //     await multisigFactory.createMultisigWallet(quorum1, validSigners1);

  //     // wallet2
  //     const validSigners2 = [
  //       owner.address,
  //       addr1.address,
  //       addr2.address,
  //       addr3.address,
  //       addr5.address,
  //     ];
  //     const quorum2 = 3;
  //     await multisigFactory.createMultisigWallet(quorum2, validSigners2);

  //     // wallet3
  //     const validSigners3 = [
  //       owner.address,
  //       addr1.address,
  //       addr2.address,
  //       addr3.address,
  //       addr5.address,
  //     ];
  //     const quorum3 = 3;
  //     await multisigFactory.createMultisigWallet(quorum3, validSigners3);

  //     expect((await multisigFactory.getMultiSigClones()).length).to.equal(3);
  //   });
  // });
});
