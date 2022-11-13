import { useState } from 'react';
import QRCode from 'react-qr-code';
import randomBytes from 'randombytes';
import { web3 } from '../../ethereum';
import { Web3Account } from 'web3-eth-accounts';
import { Stack, Typography } from '@mui/material';
import Html5QrcodePlugin from '../../Html5QrcodePlugin';

function ServiceProvider() {
    const [address, setAddress] = useState<string>();
    const [provisionId, setProvisionId] = useState<string>();
    const onNewScanResult = (decodedText: string, decodedResult: string) => {
        const [address, provisionId] = decodedText.split('||');
        setAddress(address);
        setProvisionId(provisionId);
    };

    return (
        <Stack>
            <Typography variant='h1'>
                Accept a package
            </Typography>
            <br />
            <br />
            <Html5QrcodePlugin
                fps={10}
                qrbox={250}
                disableFlip={false}
                qrCodeSuccessCallback={onNewScanResult}
            />
            <Typography variant='body1'>
                Address: {address}
            </Typography>
            <Typography variant='body1'>
                ProvisionID: {provisionId}
            </Typography>
        </Stack>
    );
}

export default ServiceProvider;
