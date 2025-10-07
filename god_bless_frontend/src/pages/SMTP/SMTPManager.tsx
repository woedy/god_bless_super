import { useCallback, useEffect, useState } from 'react';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import { baseUrl, getUserID, getUsername, getUserToken } from '../../constants';
import { useNavigate } from 'react-router-dom';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';

const SMTPManager = () => {
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [ssl, setSSL] = useState(true);

  const [smtps, setSMTPs] = useState([]);


  // State for delete confirmation modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const [inputError, setInputError] = useState('');
  const [alert, setAlert] = useState({ message: '', type: '' });

  const [isLoading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${baseUrl}api/smtp-manager/get-smtps/?&user_id=${userID}`,
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
      setSMTPs(data.data.smtps);

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
    setLoading(true);

    e.preventDefault();

    if (host === '') {
      setInputError('Host required.');
      setLoading(false);

      return;
    }

    if (port === '') {
      setInputError('Port required.');
      setLoading(false);
      return;
    }
    if (username === '') {
      setInputError('Username required.');
      setLoading(false);
      return;
    }
    if (password === '') {
      setInputError('Password required.');
      setLoading(false);
      return;
    }

    // Clear any previous error
    setInputError('');

    // Create FormData object
    const formData = new FormData();

    formData.append('user_id', userID);
    formData.append('host', host);
    formData.append('port', port);
    formData.append('username', username);
    formData.append('password', password);
    formData.append('ssl', ssl);

    // Make a POST request to the server
    const url = baseUrl + 'api/smtp-manager/add-smtp/';
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

      await fetchData();
      setAlert({ message: 'Item deleted successfully', type: 'success' });
      setHost('');
      setPort('');
      setUsername('');
      setPassword('');
    } catch (error) {
      console.error('Error updating data:', error.message);
      // Check if the error comes from server validation
      if (error.message === 'Errors' && data && data.errors) {
        setInputError(Object.values(data.errors).flat().join('\n'));
      } else {
        setInputError('Failed to add smtp.');
      }
    } finally {
      setLoading(false);
    }
  };


  const openDeleteModal = (itemId) => {
    setItemToDelete(itemId);
    setIsModalOpen(true);
  };

  const handleDelete = async (itemId) => {
    const data = { user_id: userID, id: itemId };

    try {
      const response = await fetch(`${baseUrl}api/smtp-manager/delete-smtp/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${userToken}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to delete the item');
      }

      // Refresh the data after deletion
      await fetchData();
      setAlert({ message: 'Item deleted successfully', type: 'success' });
    } catch (error) {
      console.error('Error deleting item:', error);
      setAlert({
        message: 'An error occurred while deleting the item',
        type: 'error',
      });
    } finally {
      setIsModalOpen(false);
      setItemToDelete(null);
    }
  };


  const closeDeleteModal = () => {
    setIsModalOpen(false);
    setItemToDelete(null);
  };

return (
  <>
    <div className="mx-auto max-w-350">
      <Breadcrumb pageName="SMTP Manager" />

      <div className="grid grid-cols-2 gap-8">
        <div className="col-span-1 xl:col-span-1">
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke py-4 px-7 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Add SMTP
              </h3>
            </div>
            <div className="p-7">
              {inputError && (
                <div
                  className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-3"
                  role="alert"
                >
                  <strong className="font-bold">Error!</strong>
                  <span className="block sm:inline"> {inputError}</span>
                </div>
              )}
              <form onSubmit={handleSubmitAPI}>
                <div className="mb-5.5">
                  <label
                    className="mb-3 block text-sm font-medium text-black dark:text-white"
                    htmlFor="host"
                  >
                    Host
                  </label>
                  <input
                    className="w-full rounded border border-stroke bg-gray py-3 px-4.5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                    type="text"
                    name="host"
                    id="host"
                    placeholder=""
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                  />
                </div>

                <div className="mb-5.5">
                  <label
                    className="mb-3 block text-sm font-medium text-black dark:text-white"
                    htmlFor="port"
                  >
                    Port
                  </label>
                  <input
                    className="w-full rounded border border-stroke bg-gray py-3 px-4.5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                    type="text"
                    name="port"
                    id="port"
                    placeholder=""
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                  />
                </div>


                <div className="mb-5.5">
                  <label
                    className="mb-3 block text-sm font-medium text-black dark:text-white"
                    htmlFor="username"
                  >
                    Username / Email
                  </label>
                  <input
                    className="w-full rounded border border-stroke bg-gray py-3 px-4.5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                    type="text"
                    name="username"
                    id="username"
                    placeholder=""
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>


                <div className="mb-5.5">
                  <label
                    className="mb-3 block text-sm font-medium text-black dark:text-white"
                    htmlFor="password"
                  >
                    Password
                  </label>
                  <input
                    className="w-full rounded border border-stroke bg-gray py-3 px-4.5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                    type="text"
                    name="password"
                    id="password"
                    placeholder=""
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>



                <div className="flex justify-end gap-4.5">
                  <button className="flex justify-center rounded border border-stroke py-2 px-6 font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white">
                    Cancel
                  </button>

                  {!isLoading ? (
                    <button
                      className="flex justify-center rounded bg-primary py-2 px-6 font-medium text-gray hover:bg-opacity-90"
                      type="submit"
                    >
                      + Add SMTP
                    </button>
                  ) : (
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
                  )}
                </div>
              </form>
            </div>
          </div>


        </div>


        <div className="col-span-1 xl:col-span-1">
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke py-4 px-7 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Add SMTP
              </h3>
            </div>


            <div className="grid grid-cols-4 border-t border-stroke py-4.5 px-4 dark:border-strokedark sm:grid-cols-4 md:px-6 2xl:px-7.5">
              <div className="col-span-1 flex items-center">
                <p className="font-medium">Host</p>
              </div>


              <div className="col-span-1 flex items-center">
                <p className="font-medium">Port</p>
              </div>

              <div className="col-span-1 flex items-center">
                <p className="font-medium">Username</p>
              </div>



            </div>





            {smtps
              ? smtps.map((smtp) => (
                <div
                  className="grid grid-cols-4 border-t border-stroke py-4.5 px-4 dark:border-strokedark sm:grid-cols-4 md:px-6 2xl:px-7.5 hover:bg-graydark"
                  key={smtp?.id || 'default-key'}
                >
                  <div className="col-span-1 flex items-center">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <p className="text-sm text-black dark:text-white">
                        {smtp?.host ? smtp.host : '-'}
                      </p>
                    </div>
                  </div>
                  <div className="col-span-1 flex items-center">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <p className="text-sm text-black dark:text-white">
                        {smtp?.port ? smtp.port : '-'}
                      </p>
                    </div>
                  </div>
                  <div className="col-span-1 flex items-center">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <p className="text-sm text-black dark:text-white">
                        {smtp?.username ? smtp.username : '-'}
                      </p>
                    </div>
                  </div>



                  <button
                    className="hover:text-primary"
                    onClick={() => openDeleteModal(smtp.id)} // Pass the ID of the item to be deleted
                  >
                    <svg
                      className="fill-current"
                      width="18"
                      height="18"
                      viewBox="0 0 18 18"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M13.7535 2.47502H11.5879V1.9969C11.5879 1.15315 10.9129 0.478149 10.0691 0.478149H7.90352C7.05977 0.478149 6.38477 1.15315 6.38477 1.9969V2.47502H4.21914C3.40352 2.47502 2.72852 3.15002 2.72852 3.96565V4.8094C2.72852 5.42815 3.09414 5.9344 3.62852 6.1594L4.07852 15.4688C4.13477 16.6219 5.09102 17.5219 6.24414 17.5219H11.7004C12.8535 17.5219 13.8098 16.6219 13.866 15.4688L14.3441 6.13127C14.8785 5.90627 15.2441 5.3719 15.2441 4.78127V3.93752C15.2441 3.15002 14.5691 2.47502 13.7535 2.47502ZM7.67852 1.9969C7.67852 1.85627 7.79102 1.74377 7.93164 1.74377H10.0973C10.2379 1.74377 10.3504 1.85627 10.3504 1.9969V2.47502H7.70664V1.9969H7.67852ZM4.02227 3.96565C4.02227 3.85315 4.10664 3.74065 4.24727 3.74065H13.7535C13.866 3.74065 13.9785 3.82502 13.9785 3.96565V4.8094C13.9785 4.9219 13.8941 5.0344 13.7535 5.0344H4.24727C4.13477 5.0344 4.02227 4.95002 4.02227 4.8094V3.96565ZM11.7285 16.2563H6.27227C5.79414 16.2563 5.40039 15.8906 5.37227 15.3844L4.95039 6.2719H13.0785L12.6566 15.3844C12.6004 15.8625 12.2066 16.2563 11.7285 16.2563Z"
                        fill=""
                      />
                      <path
                        d="M9.00039 9.11255C8.66289 9.11255 8.35352 9.3938 8.35352 9.75942V13.3313C8.35352 13.6688 8.63477 13.9782 9.00039 13.9782C9.33789 13.9782 9.64727 13.6969 9.64727 13.3313V9.75942C9.64727 9.3938 9.33789 9.11255 9.00039 9.11255Z"
                        fill=""
                      />
                      <path
                        d="M11.2502 9.67504C10.8846 9.64692 10.6033 9.90004 10.5752 10.2657L10.4064 12.7407C10.3783 13.0782 10.6314 13.3875 10.9971 13.4157C11.0252 13.4157 11.0252 13.4157 11.0533 13.4157C11.3908 13.4157 11.6721 13.1625 11.6721 12.825L11.8408 10.35C11.8408 9.98442 11.5877 9.70317 11.2502 9.67504Z"
                        fill=""
                      />
                      <path
                        d="M6.72245 9.67504C6.38495 9.70317 6.1037 10.0125 6.13182 10.35L6.3287 12.825C6.35683 13.1625 6.63808 13.4157 6.94745 13.4157C6.97558 13.4157 6.97558 13.4157 7.0037 13.4157C7.3412 13.3875 7.62245 13.0782 7.59433 12.7407L7.39745 10.2657C7.39745 9.90004 7.08808 9.64692 6.72245 9.67504Z"
                        fill=""
                      />
                    </svg>
                  </button>

                </div>
              ))
              : null}






          </div>


        </div>





      </div>



      <DeleteConfirmationModal
        isOpen={isModalOpen}
        itemId={itemToDelete}
        onConfirm={handleDelete}
        onCancel={closeDeleteModal}
      />
    </div>
  </>
);
};

export default SMTPManager;
