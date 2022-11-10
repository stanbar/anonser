import { useState } from 'react';
import QRCode from 'react-qr-code';
import randomBytes from 'randombytes';
import { web3 } from '../ethereum';
import { Web3Account } from 'web3-eth-accounts';

function ClientStatus() {
    const [keypair, setKeypair] = useState<Web3Account>(web3.eth.accounts.create());
    const [provisionId, setProvisionId] = useState<Buffer>(randomBytes(32));

    const value = keypair?.address + '||' + provisionId?.toString('hex');

    return (
                <div style={{ height: "auto", margin: "0 auto", maxWidth: 512, width: "100%" }}>
                    <QRCode
                        size={256}
                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                        value={value}
                        viewBox={`0 0 256 256`}
                    />
                </div>
    );
}

export default ClientStatus;

