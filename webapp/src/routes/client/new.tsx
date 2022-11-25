import { useState } from 'react';
import QRCode from 'react-qr-code';
import { Container } from '@mui/system';
import { genKeypair, rand } from 'src/crypto';
import { Typography } from '@mui/material';

function ClientNew() {
    const [keypair, setKeypair] = useState(genKeypair());
    const [provisionId, setProvisionId] = useState<Buffer>(rand(32));

    const value = '0x'+keypair?.getPublic(true, 'hex') + '||' + '0x'+provisionId.toString('hex');

    return (
        <Container>
            <br />
            <br />

            <div style={{ height: "auto", margin: "0 auto", maxWidth: 512, width: "100%" }}>
                <QRCode
                    size={256}
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                    value={value}
                    viewBox={`0 0 256 256`}
                />
            </div>
            <Typography>Private key: 0x{keypair.getPrivate("hex")}</Typography>
            
        </Container>
    );
}

export default ClientNew;

