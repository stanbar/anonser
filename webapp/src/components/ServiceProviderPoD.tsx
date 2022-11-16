import { useState } from 'react';
import { Button, ButtonGroup, Checkbox, Input, Stack, TextField, Typography } from '@mui/material';
import { useEth } from 'src/contexts/EthContext';
import { StepperComponentProps } from 'src/routes/sp';


function ServiceProviderPoD({ provision, setProvision, onNext, onBack }: StepperComponentProps) {
    const [paidInAdvance, setPaidInAdvance] = useState(false);
    const { state: { contract, accounts } } = useEth();

    if (!provision) {
        onBack()
        return (<div>No provision</div>);
    }
    const proofOfDelivery = async () => {
        await contract.methods.proofOfDelivery(provision.clientPubKey, provision.provisionId, paidInAdvance).send({ from: accounts[0] });
        onNext();
    }

    return (
        <Stack>
            <>
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
            </>
        </Stack>
    );
}

export default ServiceProviderPoD;
