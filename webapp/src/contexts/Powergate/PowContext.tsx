import { createContext, useContext } from "react";
import { createPow, Pow } from "@textile/powergate-client"
import { REACT_APP_POWERGATE_NODE_ADDRESS, REACT_APP_POWERGATE_USER_TOKEN } from "src/Constants";


const pow: Pow = createPow({ host: REACT_APP_POWERGATE_NODE_ADDRESS })

pow.setAdminToken(REACT_APP_POWERGATE_USER_TOKEN);
pow.setToken(REACT_APP_POWERGATE_USER_TOKEN);

pow.buildInfo().then((info) => {
    console.log(`Connected to powergate with version: ${info.version} `)
}).catch(console.error);

pow.userId().then((userId) => {
    console.log(`Connected to powergate with user id: ${userId.id} `)
}).catch(console.error);

const PowContext = createContext<Pow>(
    pow
);

// @ts-ignore: Don't worry about type here
export function PowProvider({ children }) {
    return <PowContext.Provider value={pow}> {children} </PowContext.Provider>;
}

export const usePow = (): Pow => useContext(PowContext);