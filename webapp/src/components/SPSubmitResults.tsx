import { Button, Stack, Typography } from '@mui/material';
import { StepperComponentProps } from 'src/routes/sp';
import { useEffect, useState } from 'react';
import { usePow } from 'src/contexts/Powergate/PowContext';
import { powTypes } from '@textile/powergate-client';
import { deriveKey } from 'src/crypto/encrypt';
import { ProvisionDelivered, ProvisionProvisioned } from 'src/Provision';
import { REACT_APP_SERVICE_PROVIDER_SEC_KEY } from 'src/Constants';
import aesjs from 'aes-js';
import ServiceProviderPoP from './SPProofOfProvision';
import UploadIcon from '@mui/icons-material/Upload';

function ServiceProviderSubmitResults({ provision, setProvision }: StepperComponentProps<ProvisionDelivered, ProvisionProvisioned>) {
    const pow = usePow();
    const [encryptedBuffer, setEncryptedBuffer] = useState<Uint8Array | null>(null)
    const [cid, setCid] = useState<string | null>(null)
    const [dealId, setDealId] = useState<number | undefined>(undefined)
    const [minerId, setMinerId] = useState<string | undefined>(undefined)

    const [jobId, setJobId] = useState<string | null>(null)
    const [jobStatus, setJobStatus] = useState<string | null>(null)
    const [cidInfo, setCidInfo] = useState<powTypes.CidInfo.AsObject | undefined>(undefined)

    useEffect(() => {
        let jobsCancel: any = null;
        if (jobId) {
            const handleJob = (job: powTypes.StorageJob.AsObject | undefined) => {
                if (!job) return;

                if (job.status === powTypes.JobStatus.JOB_STATUS_CANCELED) {
                    setJobStatus("Canceled with cause: " + job.errorCause)
                } else if (job.status === powTypes.JobStatus.JOB_STATUS_FAILED) {
                    setJobStatus(`Failed with message: ${job.errorCause}`)
                } else if (job.status === powTypes.JobStatus.JOB_STATUS_SUCCESS) {
                    setJobStatus("Succesfully stored result on IPFS and Filecoin")
                    refreshCidInfo(job.cid)
                    console.log(job.dealInfoList)
                }
            }

            // watch the job status to see the storage process progressing
            jobsCancel = pow.storageJobs.watch(handleJob, jobId)

            // if the deal is already stored there will be no storage job logs,
            // fetch the job and check status directly instad
            pow.storageJobs.get(jobId).then((job) => handleJob(job.storageJob)).catch(console.error);
        }


        let logsCancel: any = null
        if (cid) {
            // watch all log events for a cid
            logsCancel = pow.data.watchLogs((logEvent) => {
                console.log(`received event for cid ${logEvent.cid}`, logEvent)
                console.log(logEvent.message)
                if (logEvent.message === "Deal finalized") {
                    setJobStatus("Deal finalized")
                }
            }, cid)
        }

        return () => {
            jobsCancel?.()
            logsCancel?.()
        }
    }, [jobId, cid, pow.data, pow.storageJobs])

    useEffect(() => {
        console.log("cidInfo changed", cidInfo)
        if (provision && cidInfo) {
            const proposal = cidInfo?.currentStorageInfo?.cold?.filecoin?.proposalsList[0]
            const dealId = proposal?.dealId
            const miner = proposal?.miner
            console.log("cid", cidInfo.cid, "dealId", dealId, "miner", miner)
            setCid(cidInfo.cid)
            setDealId(dealId)
            setMinerId(miner)

        }
    }, [cidInfo])


    if (!provision) {
        return (<div>No provision</div>);
    }

    const onChangeHandler = async (event: any) => {
        const file = event.target.files[0];
        var reader = new FileReader();
        reader.onload = () => {
            const key = deriveKey(REACT_APP_SERVICE_PROVIDER_SEC_KEY, provision.clientPubKey);
            const aesCtr = new aesjs.ModeOfOperation.ctr(key);
            const encrypted = aesCtr.encrypt(new Uint8Array(reader.result as any))

            setEncryptedBuffer(encrypted)
        };
        reader.readAsArrayBuffer(file);
    }

    const publishResult = async () => {
        if (!encryptedBuffer) {
            console.error("no buffer loaded")
            return
        }

        if (typeof encryptedBuffer !== "object") {
            console.error("loaded buffer is not an object")
            return
        }

        const { cid } = await pow.data.stage(encryptedBuffer)
        setCid(cid);

        const { jobId } = await pow.storageConfig.apply(cid, { override: true, })
        setJobId(jobId);

        refreshCidInfo(cid)
    }

    const refreshCidInfo = async (cid: string) => {
        const { cidInfo } = await pow.data.cidInfo(cid)
        setCidInfo(cidInfo);
    }
        

    return (
        <Stack>
            <Typography>Once payment has been received, start the service and upload the results.</Typography>
            <Button component="label" startIcon={<UploadIcon />}>
                Upload
                <input type="file" name="file" accept="application/pdf" hidden onChange={onChangeHandler} />
            </Button>
            {encryptedBuffer && <Button variant='outlined' onClick={publishResult}>Publish encrypted result</Button>}
            <br />
            {cid && (
                <><span>Content Identifier (cid):</span> <Typography variant="body2">{cid}</Typography></>
            )}
            {jobStatus && <Typography>Status: {jobStatus}</Typography>}

            {cid && minerId && dealId && <><br /><ServiceProviderPoP cid={cid} minerId={minerId} dealId={dealId} provision={provision} setProvision={setProvision} /></>}
        </Stack>
    );
}

export default ServiceProviderSubmitResults;
