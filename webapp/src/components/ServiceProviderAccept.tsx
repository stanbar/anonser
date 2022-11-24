import { Button, ButtonGroup, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import Html5QrcodePlugin from '../Html5QrcodePlugin';
import { StepperComponentProps } from '../routes/sp';

function ServiceProviderAccept({ setProvision }: StepperComponentProps) {
    const [clientPubKey, setClientPubKey] = useState<string|null>(null);
    const [provisionId, setProvisionId] = useState<string|null>(null);

    const onNewScanResult = (decodedText: string, decodedResult: string) => {
        const [clientPubKey, provisionId] = decodedText.split('||');
        setClientPubKey(clientPubKey);
        setProvisionId(provisionId);
    };

    const acceptPackage = () => {
        if (provisionId && clientPubKey) {
            setProvision({clientPubKey, provisionId});
        }
    };

    return (
        <Stack>
            {(!clientPubKey || !provisionId) && (
                <Html5QrcodePlugin
                    fps={10}
                    qrbox={250}
                    disableFlip={false}
                    qrCodeSuccessCallback={onNewScanResult}
                />
            )}
            {(clientPubKey && provisionId) && (
                <>
                    <Typography variant='body1'>
                        Client public key: {clientPubKey}
                    </Typography>
                    <Typography variant='body1'>
                        ProvisionID: {provisionId}
                    </Typography>
                    <ButtonGroup>
                        <Button onClick={() => setProvision(undefined)} variant="outlined">
                            Scan again
                        </Button>
                        <Button onClick={() => acceptPackage()} variant="contained">
                            Accept
                        </Button>
                    </ButtonGroup>
                </>
            )}
        </Stack>
    );
}

export default ServiceProviderAccept;
