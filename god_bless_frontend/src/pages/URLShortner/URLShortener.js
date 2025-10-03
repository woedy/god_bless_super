// src/components/URLShortener.js
import React, { useState } from 'react';
import axios from 'axios';

const URLShortener = () => {
    const [originalURL, setOriginalURL] = useState('');
    const [shortenedURL, setShortenedURL] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://127.0.0.1:8000/api/shorten/', {
                original_url: originalURL,
            });
            setShortenedURL(`${response.data.shortened_url}`);
        } catch (error) {
            console.error("There was an error creating the shortened URL!", error);
        }
    };

    return (
        <div>
            <h1>URL Shortener</h1>
            <form onSubmit={handleSubmit}>
                <input
                    type="url"
                    value={originalURL}
                    onChange={(e) => setOriginalURL(e.target.value)}
                    placeholder="Enter URL"
                    required
                />
                <button type="submit">Shorten URL</button>
            </form>
            {shortenedURL && (
                <p>Shortened URL: <a href={shortenedURL} target="_blank" rel="noopener noreferrer">{shortenedURL}</a></p>
            )}
        </div>
    );
};

export default URLShortener;
