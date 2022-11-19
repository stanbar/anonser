import { createContext, useContext } from "react";
import { createPow, Pow } from "@textile/powergate-client"

if (!process.env.REACT_APP_POWERGATE_NODE_ADDRESS) {
    throw new Error("REACT_APP_POWERGATE_NODE_ADDRESS is not set")
}

const pow: Pow = createPow({ host: process.env.REACT_APP_POWERGATE_NODE_ADDRESS })

if (!process.env.REACT_APP_POWERGATE_USER_TOKEN) {
    throw new Error("REACT_APP_POWERGATE_USER_TOKEN is not set")
}

console.log(process.env.REACT_APP_POWERGATE_USER_TOKEN)

pow.setAdminToken(process.env.REACT_APP_POWERGATE_USER_TOKEN);
pow.setToken(process.env.REACT_APP_POWERGATE_USER_TOKEN);

const PowContext = createContext<Pow>(
    pow
);

// @ts-ignore: Don't worry about type here
export function PowProvider({ children }) {
    return <PowContext.Provider value={pow}> {children} </PowContext.Provider>;
}

export const usePow = (): Pow => useContext(PowContext);