import { Button, ButtonGroup, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useEth } from 'src/contexts/EthContext';
import { setSyntheticLeadingComments } from 'typescript';
import Html5QrcodePlugin from '../Html5QrcodePlugin';
import { Provision } from '../Provision';
import { StepperComponentProps } from '../routes/sp';

function ServiceProviderPoP({ provision, setProvision, onNext, onBack }: StepperComponentProps) {
    const [inputValue, setInputValue] = useState("");
    const [dealId, setDealId] = useState("");
    const [cid, setCid] = useState("");
    const { state: { contract, accounts } } = useEth();

    const proofOfProvision = async () => {
        if (inputValue === "") {
            alert("Please enter a value to write.");
            return;
        }
        const newValue = parseInt(inputValue);
        await contract.methods.proofOfProvision(newValue).send({ from: accounts[0] });
    }

    if (!provision) {
        onBack()
        return (<div>No provision</div>);
    }
    const onNewScanResult = (decodedText: string, decodedResult: string) => {
        const [address, provisionId] = decodedText.split('||');
        setProvision(new Provision(address, provisionId));
    };

    const acceptPackage = () => {
        console.log('acceptPackage');
        onNext();
    };

    return (
        <Stack>
            {!provision && (
                <Html5QrcodePlugin
                    fps={10}
                    qrbox={250}
                    disableFlip={false}
                    qrCodeSuccessCallback={onNewScanResult}
                />
            )}
            {provision && (
                <>
                    <Typography variant='body1'>
                        Client public key: {provision.clientPubKey}
                    </Typography>
                    <Typography variant='body1'>
                        ProvisionID: {provision.provisionId}
                    </Typography>

                    <TextField
                        id="outlined-name"
                        label="CID"
                        value={cid}
                        onChange={(e)=> setCid(e.target.value)}
                    />
                    <TextField
                        id="outlined-name"
                        label="Deal ID"
                        value={dealId}
                        onChange={(e) => setDealId(e.target.value)}
                    />
                    <ButtonGroup>
                        <Button onClick={() => proofOfProvision()} variant="outlined">
                            Submit
                        </Button>
                    </ButtonGroup>
                </>
            )}
        </Stack>
    );
}

export default ServiceProviderPoP;
