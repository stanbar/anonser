import { useReducer, useCallback, useEffect, Reducer } from "react";
import Web3 from "web3";
import EthContext from "./EthContext";
import { reducer, actions, initialState } from "./state";
import { REACT_APP_ETHEREUM_NODE_ADDRESS } from "src/Constants";
import is from "is_js";

function EthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const init = useCallback(
    async (artifact) => {
      if (artifact) {
        const web3 = new Web3(Web3.givenProvider || `ws://${REACT_APP_ETHEREUM_NODE_ADDRESS}`);
        console.log("web3", web3);
        const accounts = await web3.eth.requestAccounts();
        const networkID = await web3.eth.net.getId();
        const { abi } = artifact;
        let address, contract;
        try {
          address = artifact.networks[networkID].address;
          contract = new web3.eth.Contract(abi, address);
        } catch (err) {
          console.error(err);
        }
        dispatch({
          type: actions.init,
          data: { artifact, web3, accounts, networkID, contract }
        });
      }
    }, []);

  useEffect(() => {
    const tryInit = async () => {
      try {
        const artifact = require("../../contracts/AnonSer.json");
        init(artifact);
      } catch (err) {
        console.error(err);
      }
    };

    tryInit();
  }, [init]);

  useEffect(() => {
    const events = ["chainChanged", "accountsChanged"];
    const handleChange = () => {
      init(state.artifact);
    };

    if (window.ethereum) {
      events.forEach(e => window.ethereum.on(e, handleChange));
      return () => {
        events.forEach(e => window.ethereum.removeListener(e, handleChange));
      };
    } else {
      console.log("window.ethereum not found");
    }
  }, [init, state.artifact]);

  const isSafari = /constructor/i.test(window.HTMLElement) || (function (p) { return p.toString() === "[object SafariRemoteNotification]"; })(!window['safari']) || is.safari();
  console.log("isSafari", isSafari)
  return (
    isSafari ? <div>Sorry, this dapp does not support Safari. Please use Chrome, Brave or Firefox.</div> : (
      <EthContext.Provider value={{
        state,
        dispatch
      }}>
        {children}
      </EthContext.Provider>)
  );
}

export default EthProvider;
