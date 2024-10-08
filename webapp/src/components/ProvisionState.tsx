import { Button, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { usePow } from 'src/contexts/Powergate/PowContext';
import { Provision, ProvisionDelivered, ProvisionProvisioned, recreateFromBlockchain } from 'src/Provision';
import { useEth } from 'src/contexts/EthContext';
import { decrypt } from 'src/crypto/encrypt';
import { REACT_APP_SERVICE_PROVIDER_SEC_KEY } from 'src/Constants';
import DownloadIcon from '@mui/icons-material/Download';

function ProvisionState({ privKey, clientPubKey, provisionId }: { privKey: string, clientPubKey: string, provisionId: string }) {
    const pow = usePow();
    const { state: { contract } } = useEth();
    const [provision, setProvision] = useState<Provision | undefined>(undefined);
    const [error, setError] = useState<string>("")

    useEffect(() => {
        if (provisionId && clientPubKey) {
            getProvisionFromSmartContract(clientPubKey, provisionId)
                .then((result: any) => {
                    console.log("results from blockchain", result)
                    const bcProvision = recreateFromBlockchain(provisionId, clientPubKey, result)
                    console.log("Set provision recreated from blockchain", bcProvision)
                    //TODO: force provision type to ProvisionDelivered
                    // const p = bcProvision as ProvisionDelivered;
                    // setProvision(new ProvisionDelivered(p.clientPubKey, p.provisionId, p.issueTime, p.paymentDeadlineTime, p.provisionDeadlineTime, p.paidWithCash, p.paymentAddress));
                    setProvision(bcProvision);

                    setError("");
                })
        }
    }, [provisionId, clientPubKey])

    const getProvisionFromSmartContract = (pubKey: string, provisionId: string) =>
        contract.methods.provisions(pubKey, provisionId).call();

    const saveFile = async () => {
        if (!privKey) {
            console.error("Private key is required");
            return;
        }
        if (provision && provision instanceof ProvisionProvisioned) {
            const rawData = await pow.data.get(provision.cid)

            const decrypted = decrypt(rawData, REACT_APP_SERVICE_PROVIDER_SEC_KEY, provision.clientPubKey)

            var fileDec = new Blob([decrypted]);
            var a = document.createElement("a");
            var url = window.URL.createObjectURL(fileDec);
            var filename = "result.pdf"
            a.href = url;
            a.download = filename;
            a.click();
            window.URL.revokeObjectURL(url);
        }
    }

    return (
        <Stack>
            {!provision && (
                <>
                    <Typography variant='body1'>
                        Client public key: {clientPubKey}
                    </Typography>
                    <Typography variant='body1'>
                        ProvisionID: {provisionId}
                    </Typography>
                </>
            )}
            {provision && (
                <>
                    <Typography variant='body1'>
                        Status: {provision.status()}
                    </Typography>

                    {provision instanceof ProvisionDelivered && provision.status() == "Delivered" && !provision.paidWithCash && (<p style={{ whiteSpace: 'nowrap', overflow: 'auto'}}>Payment address: {provision.paymentAddress}</p>)}

                    <pre style={{
                        overflow: 'auto',
                    }}>
                        {JSON.stringify(provision, null, 2)}
                    </pre>


                    {provision instanceof ProvisionProvisioned && (<Button startIcon={<DownloadIcon />} onClick={saveFile}>Download</Button>)}
                </>
            )}
            {error && (error)}
        </Stack>
    );
}

export default ProvisionState;