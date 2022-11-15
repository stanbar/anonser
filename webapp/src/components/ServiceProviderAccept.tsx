import { Button, ButtonGroup, Stack, Typography } from '@mui/material';
import Html5QrcodePlugin from '../Html5QrcodePlugin';
import { Provision } from '../Provision';
import { StepperComponentProps } from '../routes/sp';

function ServiceProviderAccept({ provision, setProvision, onNext, onBack }: StepperComponentProps) {

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
                    <ButtonGroup>
                        <Button onClick={() => setProvision(null)} variant="outlined">
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
