import Html5QrcodePlugin from '../../Html5QrcodePlugin';
import { Button, ButtonGroup, Stack, TextField, Typography } from '@mui/material';
import ResultContainerPlugin from '../../ResultContainerPlugin';
import { useEffect, useState } from 'react';
import { saveAs } from 'file-saver';
import { usePow } from 'src/contexts/Powergate/PowContext';
import { getStatus, Provision } from 'src/Provision';
import { useEth } from 'src/contexts/EthContext';
import { decrypt } from 'src/crypto';

function ClientStatus() {
    const pow = usePow();
    const { state: { contract, accounts } } = useEth();
    const [clientPubKey, setClientPubKey] = useState<string | null>(null);
    const [provisionId, setProvisionId] = useState<string | null>(null);
    const [provision, setProvision] = useState<Provision | null>(null);
    const [privKey, setPrivKey] = useState<string>("");

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setPrivKey(event.target.value);
    };

    const onNewScanResult = (decodedText: string, decodedResult: string) => {
        const [clientPubKey, provisionId] = decodedText.split('||');
        setClientPubKey(clientPubKey);
        setProvisionId(provisionId);
    };

    useEffect(() => {
        console.log("Provision", provision)
        if (provisionId && clientPubKey) {
            getProvisionFromSmartContract(clientPubKey, provisionId)
                .then((result: any) => {
                    console.log("Result", {...result})
                    if (result.exist && result.cid && result.dealId) {
                        setProvision({ ...result, clientPubKey, provisionId, cid: result.cid,  } as Provision);
                    }
                })
        }
    }, [provisionId, clientPubKey])

    const getProvisionFromSmartContract = (clientPubKey: string, provisionId: string) =>
        contract.methods.provisions(clientPubKey, provisionId).call();

    const saveFile = async () => {
        if (!privKey) {
            return; 
        }
        if(provision && provision.cid) {
            console.log({ cid: provision.cid })
            const rawData = await pow.data.get(provision.cid)
            console.log({rawData})
            decrypt(rawData, accounts[0], provision.clientPubKey)
            // https://www.npmjs.com/package/file-saver
            saveAs(new Blob([rawData], { type: "application/octet-stream" }), "result.pdf");
        }
    }

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
            {provision && (
                <>
                    <Typography variant='body1'>
                        Client public key: {clientPubKey}
                    </Typography>
                    <Typography variant='body1'>
                        ProvisionID: {provisionId}
                    </Typography>
                    {getStatus(provision)}
                    <TextField value={privKey} onChange={handleChange} id="outlined-basic" label="Outlined" variant="outlined" />
                    <Button onClick={saveFile}>Save file</Button>
                </>
            )}
        </Stack>
    );
}

export default ClientStatus;

