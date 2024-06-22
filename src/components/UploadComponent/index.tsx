'use client'

import { Box, FormControl, FormLabel, Input } from '@mui/joy';

import React from 'react';

const UploadComponent = ({ acceptedFileTypes = '.txt', onUpload }) => {
    const handleFileChange = (event: any) => {
        const file = event.target.files[0];
        if (file) {
            onUpload(file);
        }
    };

    return (
        <Box
            sx={{
                p: 2,
                border: '1px solid',
                borderColor: 'primary.main',
                borderRadius: 2,
                boxShadow: 3,
                maxWidth: 400,
                margin: 'auto',
                mt: 4,
                textAlign: 'center',
            }}
        >
            <FormControl
                required
                size="md"
                color="primary"
                sx={{ mb: 2 }}
            >
                <FormLabel sx={{ fontWeight: 'bold', mb: 1 }}>
                    Upload File
                </FormLabel>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <input
                        type='file'
                        name="file"
                        accept={acceptedFileTypes}
                        style={{ display: 'none' }}
                        id="file-upload"
                        onChange={handleFileChange}
                    />
                    <label htmlFor="file-upload">
                        upload
                    </label>
                </Box>
            </FormControl>
        </Box>
    );
};

export default UploadComponent;
