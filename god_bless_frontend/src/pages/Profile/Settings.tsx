import { useCallback, useEffect, useState } from 'react';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import { baseUrl, userID, userToken } from '../../constants';
import { useNavigate } from 'react-router-dom';

const Settings = () => {
  const [abstractAPI, setAbstractAPI] = useState('');
  const [ipqualityAPI, setIpqualityAPI] = useState('');

  const [apiInputError, setApiInputError] = useState('');
  const [smtpInputError, setSMTPInputError] = useState('');
  const [alert, setAlert] = useState({ message: '', type: '' });

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${baseUrl}api/accounts/settings/?&user_id=${userID}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${userToken}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      setAbstractAPI(data.data.asbract_api);
      setIpqualityAPI(data.data.ipquality_api);

      console.log('#######################################');
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [baseUrl, userToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmitAPI = async (e) => {
    e.preventDefault();

    if (abstractAPI === '') {
      setApiInputError('Abstract API required.');
      return;
    }

    if (ipqualityAPI === '') {
      setApiInputError('IPQuality Api required.');
      return;
    }

    // Clear any previous error
    setApiInputError('');

    // Create FormData object
    const formData = new FormData();
    formData.append('abstract_api_key', abstractAPI);
    formData.append('quality_api_key', ipqualityAPI);
    formData.append('user_id', userID);

    // Make a POST request to the server
    const url = baseUrl + 'api/accounts/add-user-api/';
    let data; // Declare data outside of the try block

    try {
      setLoading(true);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Token ${userToken}`,
        },
        body: formData,
      });

      // Log formData
      const formDataObject = {};
      formData.forEach((value, key) => {
        formDataObject[key] = value;
      });
      console.log('formData:', formDataObject);

      data = await response.json(); // Assign data here

      if (!response.ok) {
        // Handle the server errors correctly
        console.log('Server error:', data.errors);
        throw new Error('Errors'); // Custom error message for handling
      }

      // Registration successful
      console.log('Updated Succesfully');
      window.location.reload();
    } catch (error) {
      console.error('Error updating data:', error.message);
      // Check if the error comes from server validation
      if (error.message === 'Errors' && data && data.errors) {
        setApiInputError(Object.values(data.errors).flat().join('\n'));
      } else {
        setApiInputError('Failed to update api.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="mx-auto max-w-270">
        <Breadcrumb pageName="Settings" />

        <div className="grid grid-cols-5 gap-8">
          <div className="col-span-5 xl:col-span-3">
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="border-b border-stroke py-4 px-7 dark:border-strokedark">
                <h3 className="font-medium text-black dark:text-white">
                  Update Api Keys
                </h3>
              </div>
              <div className="p-7">
                {apiInputError && (
                  <div
                    className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-3"
                    role="alert"
                  >
                    <strong className="font-bold">Error!</strong>
                    <span className="block sm:inline"> {apiInputError}</span>
                  </div>
                )}
                <form onSubmit={handleSubmitAPI}>
                  <div className="mb-5.5">
                    <label
                      className="mb-3 block text-sm font-medium text-black dark:text-white"
                      htmlFor="abstract"
                    >
                      Abstract Api Key
                    </label>
                    <input
                      className="w-full rounded border border-stroke bg-gray py-3 px-4.5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                      type="text"
                      name="abstract"
                      id="abstract"
                      placeholder="yu3r728rg382ytg28r3"
                      value={abstractAPI}
                      onChange={(e) => setAbstractAPI(e.target.value)}
                    />
                  </div>

                  <div className="mb-5.5">
                    <label
                      className="mb-3 block text-sm font-medium text-black dark:text-white"
                      htmlFor="api"
                    >
                      IPQuality Api Key
                    </label>
                    <input
                      className="w-full rounded border border-stroke bg-gray py-3 px-4.5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                      type="text"
                      name="api"
                      id="api"
                      placeholder="33e42e4rwyu3r728rg382ytg28r3"
                      value={ipqualityAPI}
                      onChange={(e) => setIpqualityAPI(e.target.value)}
                    />
                  </div>

                  <div className="flex justify-end gap-4.5">
                    <button className="flex justify-center rounded border border-stroke py-2 px-6 font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white">
                      Cancel
                    </button>
                    <button
                      className="flex justify-center rounded bg-primary py-2 px-6 font-medium text-gray hover:bg-opacity-90"
                      type="submit"
                    >
                      Save
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
     
        </div>
      </div>
    </>
  );
};

export default Settings;
