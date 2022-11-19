import { Stack, Typography } from '@mui/material';
import { StepperComponentProps } from 'src/routes/sp';
import FileUpload from './FileUpload';
import { useState } from 'react';
import { usePow } from 'src/contexts/Powergate/PowContext';


function ServiceProviderSubmitResults({ provision, setProvision, onNext, onBack }: StepperComponentProps) {
    const pow = usePow();

    const [newUserInfo, setNewUserInfo] = useState({
        profileImages: []
    });

    if (!provision) {
        onBack()
        return (<div>No provision</div>);
    }

    const updateUploadedFiles = (files: any) =>
        setNewUserInfo({ ...newUserInfo, profileImages: files });

    const handleSubmit = (event: any) => {
        event.preventDefault();
        //logic to create new user...
    };




    return (
        <Stack>
            <>
                <Typography variant='body1'>
                    Client public key: {provision.clientPubKey}
                </Typography>
                <Typography variant='body1'>
                    ProvisionID: {provision.provisionId}
                </Typography>
                <FileUpload
                    accept=".jpg,.png,.jpeg,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.rar,.7z"
                    label="Result document"
                    multiple
                    updateFilesCb={updateUploadedFiles}
                />
            </>
        </Stack>
    );
}

export default ServiceProviderSubmitResults;
