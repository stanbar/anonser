import { useState } from 'react';
import QRCode from 'react-qr-code';
import randomBytes from 'randombytes';
import { Container } from '@mui/system';
import { useEth } from 'src/contexts/EthContext';

function ClientNew() {
    const eth = useEth();

    const [keypair, setKeypair] = useState(eth.state.web3.eth.accounts.create());
    const [provisionId, setProvisionId] = useState<string>(eth.state.web3.utils.randomHex(32));

    const value = keypair?.address + '||' + provisionId;

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
        </Container>
    );
}

export default ClientNew;

