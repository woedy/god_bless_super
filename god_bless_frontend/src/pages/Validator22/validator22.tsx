import React, { useState } from 'react';

const FileUpload = () => {
    const [file, setFile] = useState(null);
    const [status, setStatus] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = (event) => {
        const selectedFile = event.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
        }
    };

    const handleFileUpload = async () => {
        if (!file) {
            alert("Please select a file!");
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        setIsUploading(true);
        setStatus('Uploading and validating phone numbers...');

        try {
            const response = await fetch('http://localhost:8000/upload-phone-numbers/', {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();
            if (response.ok) {
                setStatus('File uploaded and validation started successfully!');
            } else {
                setStatus('Error occurred: ' + data.message);
            }
        } catch (error) {
            setStatus('An error occurred: ' + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="max-w-sm mx-auto mt-10 p-5 border border-gray-300 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-center mb-4">Upload Phone Numbers for Validation</h2>
            <input
                type="file"
                accept=".txt"
                onChange={handleFileChange}
                className="block w-full px-4 py-2 mb-4 border border-gray-300 rounded-md"
            />
            <button
                onClick={handleFileUpload}
                disabled={isUploading}
                className={`w-full py-2 bg-blue-500 text-white rounded-md ${isUploading ? 'opacity-50' : 'hover:bg-blue-600'}`}
            >
                {isUploading ? 'Uploading...' : 'Upload File'}
            </button>
            <p className="mt-4 text-center text-gray-600">{status}</p>
        </div>
    );
};

export default FileUpload;
