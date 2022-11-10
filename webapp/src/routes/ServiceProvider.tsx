import { useState } from 'react';
import QRCode from 'react-qr-code';
import randomBytes from 'randombytes';
import { web3 } from '../ethereum';
import { Web3Account } from 'web3-eth-accounts';

function ServiceProvider() {
    const [keypair, setKeypair] = useState<Web3Account>();
    const [provisionId, setProvisionId] = useState<Buffer>();

    const value = keypair?.address + '||' + provisionId?.toString('hex');

    return (
        <div className="App">
            <header className="App-header">
                <p>
                    Provision ID: {provisionId?.toString('hex')}
                </p>
                <button onClick={() => setProvisionId(randomBytes(32))}>Random provision ID</button>

                <p>
                    keypair: {keypair?.address}
                </p>
                <button onClick={() => setKeypair(web3.eth.accounts.create())}>Random keypair</button>
                <div style={{ height: "auto", margin: "0 auto", maxWidth: 512, width: "100%" }}>
                    <QRCode
                        size={256}
                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                        value={value}
                        viewBox={`0 0 256 256`}
                    />
                </div>
            </header>
        </div>
    );
}

export default ServiceProvider;
