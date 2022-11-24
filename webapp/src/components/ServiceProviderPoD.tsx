import { useEffect, useState } from 'react';
import { Button, ButtonGroup, Checkbox, Stack, TextField, Typography } from '@mui/material';
import { useEth } from 'src/contexts/EthContext';
import { StepperComponentProps } from 'src/routes/sp';
import { Provision, upgradeToDelivered } from "../Provision";


function ServiceProviderPoD({ provision, setProvision }: StepperComponentProps) {
    const [paidInAdvance, setPaidInAdvance] = useState(false);
    const { state: { contract, accounts } } = useEth();


    const isProvedDelivery = async (provision: Provision) => {
        console.log({ provision })
        const result = await contract.methods.provisions(provision.clientPubKey, provision.provisionId).call();
        console.log({ result })
        return result.exist
    }

    const getProvisionFromSmartContract = (provision: Provision) =>
        contract.methods.provisions(provision.clientPubKey, provision.provisionId).call();


    useEffect(() => {
        if (provision) {
            getProvisionFromSmartContract(provision)
                .then((result: any) => {
                    console.log(result)
                    if (result.exist && result.issueTime && result.paymentDeadlineTime && result.provisionDeadlineTime) {
                        const delivered = upgradeToDelivered(provision, result.issueTime, result.paymentDeadlineTime, result.provisionDeadlineTime, result.paidWithCash);
                        console.log({delivered})

                        setProvision(delivered);
                    } else {
                        console.log('no provision found on blockchain')
                    }
                })
        }
    }, [provision])

    const proofOfDelivery = async () => {
        if (provision) {
            const result: any = await contract.methods.proofOfDelivery(provision.clientPubKey, provision.provisionId, paidInAdvance).send({ from: accounts[0] });
            console.log({ result })
            const provisionFromBc = result.events.ProofOfDelivery.returnValues;
            setProvision(upgradeToDelivered(provision, provisionFromBc.issueTime, provisionFromBc.paymentDeadlineTime, provisionFromBc.provisionDeadlineTime, provisionFromBc.paidInAdvance))
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
                <Checkbox
                    checked={paidInAdvance}
                    onChange={(e) => setPaidInAdvance(e.target.checked)}
                    inputProps={{ 'aria-label': 'controlled' }}
                />
                <TextField inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }} />
                <ButtonGroup>
                    <Button onClick={() => proofOfDelivery()} variant="outlined">
                        Submit
                    </Button>
                </ButtonGroup>
            </Stack>
        )
    }
}

export default ServiceProviderPoD;
