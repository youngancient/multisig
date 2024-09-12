import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const MultiSigFactoryModule = buildModule("MultiSigFactoryModule", (m) => {

  const multiSigFactory = m.contract("MultisigFactory");

  return { multiSigFactory };
});

export default MultiSigFactoryModule;
