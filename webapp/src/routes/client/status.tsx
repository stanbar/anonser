import Html5QrcodePlugin from '../../Html5QrcodePlugin';
import { Stack, Stepper } from '@mui/material';
import { useEffect, useState } from 'react';
import ProvisionState from 'src/components/ProvisionState';
import { StepWrapper } from '../sp';

function ClientStatus() {
    const [clientPubKey, setClientPubKey] = useState<string | null>(null);
    const [provisionId, setProvisionId] = useState<string | null>(null);
    const [privKey, setPrivKey] = useState<string>("");
    const [activeStep, setActiveStep] = useState(0);

    useEffect(() => {
        if (!clientPubKey || !provisionId) {
            setActiveStep(0)
        } else if (!privKey) {
            setActiveStep(1)
        } else {
            setActiveStep(2)
        }

    }, [clientPubKey, provisionId, privKey])

    const onUploadNewPrivKeyHandler = async (event: any) => {
        const file = event.target.files[0];
        var reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === "string") {
                setPrivKey(reader.result);
            } else {
                setPrivKey(String(reader.result));
            }
        };
        reader.readAsArrayBuffer(file);
    }

    const onNewScanResult = (decodedText: string, decodedResult: string) => {
        const [clientPubKey, provisionId] = decodedText.split('||');
        console.log("Decoded", clientPubKey, provisionId)
        setClientPubKey(clientPubKey);
        setProvisionId(provisionId);
    };


    return (
        <Stack>
            <Stepper activeStep={activeStep} orientation="vertical">
                {(StepWrapper({
                    label: "Scan QR code",
                    description: "Scan the QR code with provision request",
                    isLast: false,
                    children: (<Html5QrcodePlugin
                        fps={10}
                        qrbox={250}
                        disableFlip={false}
                        qrCodeSuccessCallback={onNewScanResult}
                    />),
                }))}
                {(StepWrapper({
                    label: "Decryption key",
                    description: "Upload decryption (private) key",
                    isLast: false,
                    children: (<input type="file" name="privKey" onChange={onUploadNewPrivKeyHandler} />),
                }))}
                {(StepWrapper({
                    label: "Provision status",
                    description: "",
                    isLast: true,
                    children: (clientPubKey && provisionId && <ProvisionState privKey={privKey} clientPubKey={clientPubKey} provisionId={provisionId} />),
                }))}
            </Stepper>
        </Stack>
    );
}

export default ClientStatus;

