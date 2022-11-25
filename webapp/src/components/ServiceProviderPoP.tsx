import { Button, ButtonGroup, Stack, TextField, Typography } from '@mui/material';
import { useEffect } from 'react';
import { useEth } from 'src/contexts/EthContext';
import { Provision } from '../Provision';
import { StepperComponentProps } from '../routes/sp';
import { upgradeToProvisioned } from "../Provision";

function ServiceProviderPoP({ provision, setProvision }: StepperComponentProps) {
    const { state: { contract, accounts } } = useEth();

    const getProvisionFromSmartContract = (provision: Provision) =>
        contract.methods.provisions(provision.clientPubKey, provision.provisionId).call();

    useEffect(() => {
        if (provision) {
            getProvisionFromSmartContract(provision)
                .then((result: any) => {

                    if (result.miner && result.dealId && result?.cid?.length == 46){
                        const delivered = upgradeToProvisioned(provision);
                        setProvision(delivered);
                    } else {
                        console.log('unknown structure fetched from blockchain', result)
                    }
                })
        }
    }, [provision])

    const proofOfProvision = async () => {
        if (provision && provision.minerId && provision.dealId && provision?.cid?.length == 46){
            const result = await contract.methods.proofOfProvision(provision.clientPubKey, provision.provisionId, provision.cid, provision.dealId, provision.minerId).send({ from: accounts[0] });
            console.log({ result, provision })
            const provisionFromBc = result.events.ProofOfProvision.returnValues;
            if (provisionFromBc.cid && provisionFromBc.dealId && provisionFromBc.dealId) {
                setProvision(upgradeToProvisioned(provision))
            }
        } else {
            console.log("Unknown structure", provision)
        }
    }

    if (!provision) {
        return (<div>No provision</div>);
    } else {
        return (
            <Stack>
                <Typography variant='body1'>
                    Client public key: {provision.clientPubKey}
                </Typography>
                <Typography variant='body1'>
                    ProvisionID: {provision.provisionId}
                </Typography>
                <ButtonGroup>
                    <Button onClick={() => proofOfProvision()} variant="outlined">
                        Submit
                    </Button>
                </ButtonGroup>
            </Stack>
        )
    }
}

export default ServiceProviderPoP;
