import { useState } from 'react';
import QRCode from 'react-qr-code';
import { genKeypair, rand } from 'src/crypto';
import { Button, Stack, Stepper, Typography } from '@mui/material';
import { StepWrapper } from '../sp';
import { Link } from 'react-router-dom';

function ClientNew() {
    const [keypair, setKeypair] = useState(genKeypair());
    const [provisionId, setProvisionId] = useState<Buffer>(rand(32));
    const [activeStep, setActiveStep] = useState(0);

    const value = '0x' + keypair?.getPublic(true, 'hex') + '||' + '0x' + provisionId.toString('hex');

    const downloadDecryptionKey = (e: any) => {
        e.preventDefault();
        const element = document.createElement("a");
        const file = new Blob([keypair.getPrivate('hex')], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = "decryption_key.txt";
        document.body.appendChild(element); // Required for this to work in FireFox
        element.click();
        setActiveStep(2)
    }

    const downloadQrCode = (e: any) => {
        e.preventDefault();
        const svg = document.getElementById("QRCode")!;
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            const pngFile = canvas.toDataURL("image/png");
            const downloadLink = document.createElement("a");
            downloadLink.download = "provision.png";
            downloadLink.href = `${pngFile}`;
            downloadLink.click();
            setActiveStep(1)
        };
        img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
    }


    return (

        <Stack>
            <Typography variant='h5'>
                New provision
            </Typography>
            <Stepper activeStep={activeStep} orientation="vertical">
                {StepWrapper({
                    children: (<Stack>
                        <div style={{ height: "auto", margin: "0 auto", maxWidth: 256, width: "100%" }}>
                            <QRCode
                                id="QRCode"
                                size={256}
                                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                value={value}
                                viewBox={`0 0 256 256`}
                            />
                        </div>

                        <Button onClick={downloadQrCode}>Download QR code</Button>
                    </Stack>
                    ),
                    label: "Generate provision request",
                    description: "This QR code allows you to identify your service anonymously. Keep it in a safe place to track your order process.",
                    isLast: false
                })}
                {StepWrapper({
                    children: (<Button onClick={downloadDecryptionKey}>Download decryption key</Button>),
                    label: "Download decryption key",
                    description: "Download the decryption key, you will need it to decrypt the results.",
                    isLast: false
                })}

                {StepWrapper({
                    label: "Delivery",
                    description: "Stick the QR code on the package and deliver it to the service provider.",
                    children: (<div>You can track your provision status <Link to={"/client/status"}>here</Link></div>),
                    isLast: true
                })}
            </Stepper>
        </Stack>
    );
}

export default ClientNew;

