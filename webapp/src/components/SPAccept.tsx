import { useEffect, useState } from 'react';
import { useEth } from 'src/contexts/EthContext';
import { Provision, ProvisionBase, recreateFromBlockchain } from 'src/Provision';
import Html5QrcodePlugin from '../Html5QrcodePlugin';
import { StepperComponentProps } from '../routes/sp';

function ServiceProviderAccept({ setProvision }: StepperComponentProps<undefined, Provision >) {
    const [clientPubKey, setClientPubKey] = useState<string|undefined>(undefined);
    const [provisionId, setProvisionId] = useState<string|undefined>(undefined);
    const { state: { contract } } = useEth();

    const onNewScanResult = (decodedText: string, decodedResult: string) => {
        const [clientPubKey, provisionId] = decodedText.split('||');
        setClientPubKey(clientPubKey);
        setProvisionId(provisionId);
        acceptPackage();
    };

    const getProvisionFromSmartContract = (provision: ProvisionBase) =>
        contract.methods.provisions(provision.clientPubKey, provision.provisionId).call();

    useEffect(() => {
        acceptPackage();
    }, [clientPubKey, provisionId]);

    const acceptPackage = async () => {
        if (provisionId && clientPubKey) {
            const provisionBase = new ProvisionBase(clientPubKey, provisionId)

            // Check if the provision already started and is recorded on blockchain
            const result = await getProvisionFromSmartContract(provisionBase)
            if (result.exist) {
                // if yes, then recreate
                console.log("Provision already exists on blockchain")
                const bcProvision = recreateFromBlockchain(provisionBase.provisionId, provisionBase.clientPubKey, result)
                setProvision(bcProvision ?? provisionBase);
            } else {
                // if not, then just set the base provision
                console.log("Provision does not exist on blockchain")
                setProvision(provisionBase);
            }
        }
    };

    return (
            <Html5QrcodePlugin
                fps={10}
                qrbox={250}
                disableFlip={false}
                qrCodeSuccessCallback={onNewScanResult}
            />
    );
}

export default ServiceProviderAccept;
