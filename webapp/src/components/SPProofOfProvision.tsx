import { Button, Stack, Typography } from '@mui/material';
import { useEth } from 'src/contexts/EthContext';
import { ProvisionDelivered, ProvisionProvisioned, recreateFromBlockchain } from '../Provision';
import { StepperComponentProps } from '../routes/sp';

function ServiceProviderPoP({ cid, minerId, dealId, provision, setProvision }: StepperComponentProps<ProvisionDelivered, ProvisionProvisioned> & { cid: string, minerId: string, dealId: number }) {
    const { state: { contract, accounts } } = useEth();

    const proofOfProvision = async () => {
        if (provision && minerId && dealId && cid?.length == 46) {
            const result = await contract.methods.proofOfProvision(provision.clientPubKey, provision.provisionId, cid, dealId, minerId).send({ from: accounts[0] });
            console.log({ result })
            const provisionFromBc = result.events.ProofOfProvision.returnValues;
            const bcProvision = recreateFromBlockchain(provision.provisionId, provision.clientPubKey, provisionFromBc)
            if (bcProvision instanceof ProvisionProvisioned) {
                setProvision(bcProvision);
            } else {
                console.error("Failed to submit proof of delivery")
            }

        } else {
            console.log("Unknown structure", provision)
        }
    }

    if (!provision) {
        return (<div>No provision</div>);
    }
    return (
        <Stack>
            <Typography>Publish a proof of provision to the blockchain. This will be used to verify the provision was completed in time.</Typography>
            <Button onClick={proofOfProvision} variant="outlined">
                Submit
            </Button>
        </Stack>
    )
}

export default ServiceProviderPoP;
