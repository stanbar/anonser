import { Button, Stack, Typography } from '@mui/material';
import { StepperComponentProps } from 'src/routes/sp';
import { useEffect, useState } from 'react';
import { usePow } from 'src/contexts/Powergate/PowContext';
import { powTypes } from '@textile/powergate-client';
import { encrypt } from 'src/crypto/encrypt';
import { useEth } from 'src/contexts/EthContext';
import { getStatus, Provision, upgradeToUploaded } from 'src/Provision';


function ServiceProviderSubmitResults({ provision, setProvision }: StepperComponentProps) {
    const pow = usePow();
    const { state: { contract, accounts } } = useEth();
    const [loadedBuffer, setLoadedBuffer] = useState<ArrayBuffer | null | undefined | string>(null)
    const [encryptedBuffer, setEncryptedBuffer] = useState<Uint8Array | null>(null)
    const [cid, setCid] = useState<string | null>(null)
    const [jobId, setJobId] = useState<string | null>(null)
    const [jobStatus, setJobStatus] = useState<string | null>(null)
    const [jobLogEvent, setJobLogEvent] = useState<string | null>(null)
    const [cidInfo, setCidInfo] = useState<powTypes.CidInfo.AsObject | undefined>(undefined)

    useEffect(() => {
        let jobsCancel: any = null;
        if (jobId && provision) {
            // watch the job status to see the storage process progressing
            jobsCancel = pow.storageJobs.watch((job) => {
                if (job.status === powTypes.JobStatus.JOB_STATUS_CANCELED) {
                    setJobStatus("Canceled with cause: " + job.errorCause)
                } else if (job.status === powTypes.JobStatus.JOB_STATUS_FAILED) {
                    setJobStatus(`Failed with message: ${job.errorCause}`)
                } else if (job.status === powTypes.JobStatus.JOB_STATUS_SUCCESS) {
                    setJobStatus("succesfully stored in Filecoin")
                    console.log(job.dealInfoList)
                }
            }, jobId)
        }

        let logsCancel: any = null
        if (cid) {
            getCidInfo(cid)
            // watch all log events for a cid
            logsCancel = pow.data.watchLogs((logEvent) => {
                console.log(`received event for cid ${logEvent.cid}`, logEvent)
                setJobLogEvent(logEvent.message)
            }, cid)
        }

        return () => {
            jobsCancel?.()
            logsCancel?.()
        }
    }, [jobId, cid, pow.data, pow.storageJobs])

    useEffect(() => {
        if (provision && cidInfo) {
            const proposal = cidInfo?.currentStorageInfo?.cold?.filecoin?.proposalsList[0]
            const dealId = proposal?.dealId
            const miner = proposal?.miner
            console.log("proposal", proposal)
            console.log("dealId", dealId)
            console.log("miner", miner)
            console.log("cid", cidInfo.cid)
            if (dealId && miner) {
                const upgraded = upgradeToUploaded(provision, cidInfo.cid, dealId, miner)
                console.log("upgraded", upgraded)
                setProvision(upgraded);
            }
        }
    }, [cidInfo])

    useEffect(() => {
        if (provision) {
            getProvisionFromSmartContract(provision)
                .then((result: any) => {
                    if (result.miner && result.dealId && result?.cid?.length == 46){
                        const delivered = upgradeToUploaded(provision, result.cid, result.dealId, result.miner);
                        console.log({ delivered })
                        setProvision(delivered);
                    } else if (!result) {
                        console.log('no provision found on blockchain')
                    } else {
                        console.log('unknown structure fetched from blockchain', result)
                    }
                })
        }
    }, [provision])


    if (!provision) {
        return (<div>No provision</div>);
    }

    const getProvisionFromSmartContract = (provision: Provision) =>
        contract.methods.provisions(provision.clientPubKey, provision.provisionId).call();

    const encryptBuffer = async () => {
        if (loadedBuffer && typeof loadedBuffer === "object") {
            const encrypted = await encrypt(new Uint8Array(loadedBuffer), accounts[0], provision.clientPubKey)
            setEncryptedBuffer(encrypted)
        }
    }

    const publishResult = async () => {
        if (encryptedBuffer && typeof encryptedBuffer === "object") {
            const { cid } = await pow.data.stage(encryptedBuffer as Uint8Array)
            setCid(cid);
            const { jobId } = await pow.storageConfig.apply(cid, { override: true, })
            setJobId(jobId);
        }
    }

    const getCidInfo = async (cid: string | null) => {
        if (cid) {
            const { cidInfo } = await pow.data.cidInfo(cid)
            setCidInfo(cidInfo);
        }
    }

    const onChangeHandler = async (event: any) => {
        const file = event.target.files[0];
        try {
            const buffer = await readArrayBuffer(file)
            setLoadedBuffer(buffer)
            console.log("loaded buffer", buffer)
        } catch (e) {
            console.error(e)
        }
    }

    const readArrayBuffer = async (file: File): Promise<ArrayBuffer | null | undefined | string> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => { resolve(e.target?.result) };
            reader.onabort = () => { reject(reader.error) };
            reader.onerror = () => { reject(reader.error) };
            reader.readAsArrayBuffer(file);
        })

    return (
        <Stack>
            <>
                <Typography variant='body1'>
                    Client public key: {provision.clientPubKey}
                </Typography>
                <Typography variant='body1'>
                    ProvisionID: {provision.provisionId}
                </Typography>
                <input type="file" name="file" onChange={onChangeHandler} />

                {loadedBuffer && <Button onClick={encryptBuffer}>Encrypt</Button>}
                {encryptedBuffer && <Typography>Encrypted length: {encryptedBuffer.length}</Typography>}

                {encryptedBuffer && <Button onClick={publishResult}>Publish encrypted result</Button>}
                {cid && <Typography>cid: {cid}</Typography>}
                {jobId && <Typography>jobId: {jobId}</Typography>}
                {jobLogEvent && <Typography>jobLogEvent: {jobLogEvent}</Typography>}
                {jobStatus && <Typography>jobStatus: {jobStatus}</Typography>}
                {cid && <Button onClick={()=>getCidInfo(cid)}>Get CID Info</Button>}
            </>
        </Stack>
    );
}

export default ServiceProviderSubmitResults;
