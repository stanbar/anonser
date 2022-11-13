import Html5QrcodePlugin from '../../Html5QrcodePlugin';
import { Stack } from '@mui/material';
import ResultContainerPlugin from '../../ResultContainerPlugin';
import { useState } from 'react';

function ClientStatus() {
    const [decodedResults, setDecodedResults] = useState<string[]>([]);
    const onNewScanResult = (decodedText: any, decodedResult: string) => {
        console.log("App [result]", decodedResult);
        setDecodedResults(prev => [...prev, decodedResult]);
    };

    return (
        <Stack>
            <Html5QrcodePlugin
                    fps={10}
                    qrbox={250}
                    disableFlip={false}
                    qrCodeSuccessCallback={onNewScanResult}
                />
            <ResultContainerPlugin results={decodedResults} />
        </Stack>
    );
}

export default ClientStatus;

