import { useContext } from "react";
import EthContext from "./EthContext";
import type Web3 from "web3";
import {Contract} from "web3-eth-contract";

interface EthState {
     dispatch: any;
     state: { artifact: object, web3: Web3, accounts: string[], networkID: number, contract: Contract  }
} 

const useEth = (): EthState  => useContext(EthContext);

export default useEth;
