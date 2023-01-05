import { useEffect, useState } from 'react';
import { Button, ButtonGroup, Checkbox, FormControlLabel, Stack, TextField, Typography } from '@mui/material';
import { useEth } from 'src/contexts/EthContext';
import { StepperComponentProps } from 'src/routes/sp';
import { ProvisionDelivered, ProvisionBase, ProvisionProvisioned, recreateFromBlockchain } from "../Provision";


function ServiceProviderPoD({ provision, setProvision }: StepperComponentProps<ProvisionBase, ProvisionDelivered | ProvisionProvisioned>) {
    const [paidInCash, setPaidInCash] = useState(true);
    const [paymentAddress, setPaymentAddress] = useState("");
    const { state: { contract, accounts } } = useEth();


    const isProvedDelivery = async (provision: ProvisionBase) => {
        console.log({ provision })
        const result = await contract.methods.provisions(provision.clientPubKey, provision.provisionId).call();
        console.log({ result })
        return result.exist
    }

    const getProvisionFromSmartContract = (provision: ProvisionBase) =>
        contract.methods.provisions(provision.clientPubKey, provision.provisionId).call();

    const proofOfDelivery = async () => {
        if (provision) {
            const result: any = await contract.methods.proofOfDelivery(provision.clientPubKey, provision.provisionId, paidInCash, paymentAddress).send({ from: accounts[0] });
            console.log({ result })
            const provisionFromBc = result.events.ProofOfDelivery.returnValues;
            const bcProvision = recreateFromBlockchain(provision.provisionId, provision.clientPubKey, provisionFromBc)
            if (bcProvision instanceof ProvisionDelivered || bcProvision instanceof ProvisionProvisioned) {
                setProvision(bcProvision);
            } else {
                console.error("Failed to submit proof of delivery")
            }
        }
    }

    if (!provision) {
        return (<div>No provision</div>);
    } else {
        return (
            <Stack>
                <Typography variant='body1'>
                    Client's public key:
                </Typography>
                    <Typography variant='body2'>
                         {provision.clientPubKey}
                    </Typography>
                <Typography variant='body1'>
                    Provision ID: 
                </Typography>
                    <Typography variant='body2'>
                        {provision.provisionId}
                    </Typography>
                <FormControlLabel control={<Checkbox checked={paidInCash} onChange={(e) => setPaidInCash(e.target.checked)} />} label="Paid in cash" />
                {!paidInCash && <TextField value={paymentAddress} onChange={(e) => setPaymentAddress(e.target.value)} placeholder="Payment address" margin="normal" size="small" />}
                <Button onClick={() => proofOfDelivery()} variant="outlined">
                    Publish the proof of delivery
                </Button>
            </Stack>
        )
    }
}

export default ServiceProviderPoD;
