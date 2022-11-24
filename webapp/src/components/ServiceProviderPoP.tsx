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
                    if (result.exist && result.cid && result.dealId) {
                        const delivered = upgradeToProvisioned(provision);
                        setProvision(delivered);
                    }
                })
        }
    }, [provision])

    const proofOfProvision = async () => {
        if (provision) {
            const result = await contract.methods.proofOfProvision(provision.clientPubKey, provision.provisionId, provision.cid, provision.dealId).send({ from: accounts[0] });
            console.log({ result })
            const provisionFromBc = result.events.ProofOfProvision.returnValues;
            if (provisionFromBc.exist && provisionFromBc.cid && provisionFromBc.dealId) {
                setProvision(upgradeToProvisioned(provision))
            }
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
