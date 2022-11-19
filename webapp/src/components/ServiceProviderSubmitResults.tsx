import { Button, Stack, Typography } from '@mui/material';
import { StepperComponentProps } from 'src/routes/sp';
import { useEffect, useState } from 'react';
import { usePow } from 'src/contexts/Powergate/PowContext';
import { powTypes } from '@textile/powergate-client';


function ServiceProviderSubmitResults({ provision, setProvision, onNext, onBack }: StepperComponentProps) {
    const pow = usePow();
    const [loadedBuffer, setLoadedBuffer] = useState<ArrayBuffer | null | undefined | string>(null)
    const [cid, setCid] = useState<string|null>(null)
    const [jobId, setJobId] = useState<string|null>(null)
    const [jobStatus, setJobStatus] = useState<string|null>(null)
    const [jobLogEvent, setJobLogEvent] = useState<string|null>(null)
    const [dealId, setDealID] = useState<string|null>(null)
    const [cidInfo, setCidInfo] = useState<string|null>(null)

    useEffect(() => {
        let jobsCancel: any = null;
        if (jobId){
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


    if (!provision) {
        onBack()
        return (<div>No provision</div>);
    }

    const publishResult = async () => {
        if(loadedBuffer && typeof loadedBuffer === "object") {
            const { cid } = await pow.data.stage(loadedBuffer as Uint8Array)
            setCid(cid);
            const { jobId } = await pow.storageConfig.apply(cid, { override: true, })
            setJobId(jobId);
        }
    }

    const getCidInfo = async () => {
        if (cid) {
            const { cidInfo } = await pow.data.cidInfo(cid)
            setCidInfo(JSON.stringify(cidInfo, null, 2));
            const dealRecords = await pow.deals.storageDealRecords({ includeFinal: true })
            console.log("deal records", dealRecords)
            dealRecords.recordsList.forEach((record) => {
                console.log("record", record)
            })
        }
    }


    const onChangeHandler = async (event: any) => {
        const file = event.target.files[0];
        try {
            const buffer = await readArrayBuffer(file)
            setLoadedBuffer(buffer)
            console.log("loaded buffer", buffer)
        } catch(e){
            console.error(e)
        }
    }
    const readArrayBuffer = async (file: File): Promise<ArrayBuffer|null|undefined|string> =>
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
                {loadedBuffer && <Button onClick={publishResult}>Publish result</Button>}
                {cid && <Typography>cid: {cid}</Typography>}
                {jobId && <Typography>jobId: {jobId}</Typography>}
                {jobLogEvent && <Typography>jobLogEvent: {jobLogEvent}</Typography>}
                {jobStatus && <Typography>jobStatus: {jobStatus}</Typography>}
                {cid && <Button onClick={getCidInfo}>Get cid info</Button>}
                {cidInfo && <pre>cid info: {cidInfo}</pre>}
            </>
        </Stack>
    );
}

export default ServiceProviderSubmitResults;
