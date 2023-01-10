const requires = (envVar: string | undefined): string => {
    if (!envVar) {
        throw new Error(`${envVar} not set`);
    }
    return envVar;
}

export const REACT_APP_SERVICE_PROVIDER_SEC_KEY = requires(process.env.REACT_APP_SERVICE_PROVIDER_SEC_KEY)
export const REACT_APP_SERVICE_PROVIDER_PUB_KEY = requires(process.env.REACT_APP_SERVICE_PROVIDER_PUB_KEY)
export const REACT_APP_ETHEREUM_NODE_ADDRESS = requires(process.env.REACT_APP_ETHEREUM_NODE_ADDRESS)
export const REACT_APP_POWERGATE_NODE_ADDRESS = requires(process.env.REACT_APP_POWERGATE_NODE_ADDRESS)
export const REACT_APP_POWERGATE_USER_TOKEN = requires(process.env.REACT_APP_POWERGATE_USER_TOKEN)