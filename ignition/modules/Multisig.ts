import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const MultiSigModule = buildModule("MultiSigModule", (m) => {
  const quorum = 2;
  const validSigners = [
    "0x089244FFCd2e346FD64FaA873d824dAA33258A6A",
    "0xa6B1feB40D1c8eeAD5AFD6f7372E02B637F142FA",
    "0x0f09D1Fb501041E32170b1B759f1b2ef6349C490",
    "0x9E8882E178BD006Ef75F6b7D3C9A9EE129eb2CA8"
  ];

  const multiSig = m.contract("MultiSig",[quorum,validSigners]);

  return { multiSig };
});

export default MultiSigModule;
