import { useCallback, useEffect, useState } from 'react';
import {
  baseUrl,
  baseUrlMedia,
  projectID,
  truncateText,
  userID,
  userToken,
} from '../../constants';
import { Link, useLocation } from 'react-router-dom';
import Pagination from '../../components/Pagination';
import Alert2 from '../UiElements/Alert2';
import ClearConfirmationModal from '../../components/ClearConfirmationModal';
import SingleValidationConfirmationModal from './SingleValidationConfirmationModal';
import BulkValidConfirmationModal from './BulkValidConfirmationModal';

const AllNumbers = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [itemCount, setItemCount] = useState(0);
  const [numbers, setNumbers] = useState([]);
  const [totalPages, setTotalPages] = useState(1); // Default to 1 to avoid issues
  const [loading, setLoading] = useState(false);
  const [loading2, setLoading2] = useState(false);
  const [loading3, setLoading3] = useState(false);
  const [loading4, setLoading4] = useState(false);
  const [inputError, setInputError] = useState('');
  const [selectedNumbers, setSelectedNumbers] = useState([]);

  
  const [itemToSingleValidation, setItemToSingleValidation] = useState(null);
  const [isSingleValidationModalOpen, setIsSingleValidationModalOpen] =
    useState(false);

  const [itemToSingleValidation2, setItemToSingleValidation2] = useState(null);
  const [isSingleValidationModalOpen2, setIsSingleValidationModalOpen2] =
    useState(false);

  const [itemToSingleValidationFree, setItemToSingleValidationFree] =
    useState(null);
  const [isSingleValidationModalOpenFree, setIsSingleValidationModalOpenFree] =
    useState(false);

  const [isBulkValidCModalOpen, setIsBulkValidModalOpen] = useState(false);
  const [isBulkValidCModalOpen2, setIsBulkValidModalOpen2] = useState(false);
  const [isBulkValidCModalOpenFree, setIsBulkValidModalOpenFree] =
    useState(false);
  const [itemToBulkValid, setItemToBulkValid] = useState(null);
  const [itemToBulkValid2, setItemToBulkValid2] = useState(null);
  const [itemToBulkValidFree, setItemToBulkValidFree] = useState(null);

  // State for alerts
  const [alert, setAlert] = useState({ message: '', type: '' });

  const [error, setError] = useState(null);
  const [validationMessage, setValidationMessage] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalOpenDelete, setIsModalOpenDelete] = useState(false);


  const location = useLocation();
  const { project_id } = location.state || {};

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${baseUrl}api/phone-generator/list-numbers/?search=${encodeURIComponent(
          search,
        )}&page=${page}&user_id=${userID}&project_id=${projectID}`,
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
      setNumbers(data.data.numbers);
      setTotalPages(data.data.pagination.total_pages);
      setItemCount(data.data.pagination.count);
      console.log('Total Pages:', data.data.pagination.total_pages);
      console.log('ppp:', data.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [baseUrl, search, page, userToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const validateNumbers = async () => {
    setLoading(true);
    setError(null);
    setValidationMessage('');

    try {
      const response = await fetch(
        `${baseUrl}api/phone-validator/start-validation/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${userToken}`,
          },
          body: JSON.stringify({
            user_id: userID,
          }),
        },
      );

      const responseData = await response.json(); // Parse response body as JSON

      if (!response.ok) {
        console.log('#########################');
        if (response.status === 400) {
          // Check if the error comes from server validation
          if (
            responseData.message === 'Errors' &&
            responseData &&
            responseData.errors
          ) {
            setInputError(Object.values(responseData.errors).flat().join('\n'));
          }
        }

        throw new Error('Failed to validate the item');
      }

      // Refresh the data after deletion
      await fetchData();
      setAlert({ message: 'Validation Started successfully', type: 'success' });
      setValidationMessage('Validation Started successfully');
    } catch (error) {
      console.error('Error Validating item:', error);
      // Check if the error comes from server validation
      if (error.message === 'Errors' && data && data.errors) {
        setInputError(Object.values(data.errors).flat().join('\n'));
      }
      setAlert({
        message: 'An error occurred while validatin the item',
        type: 'error',
      });
    } finally {
      setIsBulkValidModalOpen(false);
    }
  };

  const openBulkValidModal = (itemId) => {
    setItemToBulkValid(itemId);
    setIsBulkValidModalOpen(true);
  };

  const closeBulkValidModal = () => {
    setIsBulkValidModalOpen(false);
    setItemToBulkValid(null);
  };

  const validateNumbers2 = async () => {
    setLoading(true);
    setError(null);
    setValidationMessage('');

    try {
      const response = await fetch(
        `${baseUrl}api/phone-validator/start-validation-quality/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${userToken}`,
          },
          body: JSON.stringify({
            user_id: userID,
          }),
        },
      );

      const responseData = await response.json(); // Parse response body as JSON

      if (!response.ok) {
        console.log('#########################');
        if (response.status === 400) {
          // Check if the error comes from server validation
          if (
            responseData.message === 'Errors' &&
            responseData &&
            responseData.errors
          ) {
            setInputError(Object.values(responseData.errors).flat().join('\n'));
          }
        }

        throw new Error('Failed to validate the item');
      }

      // Refresh the data after deletion
      await fetchData();
      setAlert({ message: 'Validation Started successfully', type: 'success' });
      setValidationMessage('Validation Started successfully');
    } catch (error) {
      console.error('Error Validating item:', error);
      // Check if the error comes from server validation
      if (error.message === 'Errors' && data && data.errors) {
        setInputError(Object.values(data.errors).flat().join('\n'));
      }
      setAlert({
        message: 'An error occurred while validatin the item',
        type: 'error',
      });
    } finally {
      setIsBulkValidModalOpen2(false);
    }
  };

  const openBulkValidModal2 = (itemId) => {
    setItemToBulkValid2(itemId);
    setIsBulkValidModalOpen2(true);
  };
  const closeBulkValidModal2 = () => {
    setIsBulkValidModalOpen2(false);
    setItemToBulkValid2(null);
  };


  const validateNumbersFree = async () => {
    setLoading(true);
    setError(null);
    setValidationMessage('');

    try {
      const response = await fetch(
        `${baseUrl}api/phone-validator/start-validation-free/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${userToken}`,
          },
          body: JSON.stringify({
            user_id: userID,
            project_id: projectID,
          }),
        },
      );

      const responseData = await response.json(); // Parse response body as JSON

      if (!response.ok) {
        console.log('#########################');
        if (response.status === 400) {
          // Check if the error comes from server validation
          if (
            responseData.message === 'Errors' &&
            responseData &&
            responseData.errors
          ) {
            setInputError(Object.values(responseData.errors).flat().join('\n'));
          }
        }

        throw new Error('Failed to validate the item');
      }

      // Refresh the data after deletion
      await fetchData();
      setAlert({ message: 'Validation Started successfully', type: 'success' });
      setValidationMessage('Validation Started successfully');
    } catch (error) {
      console.error('Error Validating item:', error);
      // Check if the error comes from server validation
      if (error.message === 'Errors' && data && data.errors) {
        setInputError(Object.values(data.errors).flat().join('\n'));
      }
      setAlert({
        message: 'An error occurred while validatin the item',
        type: 'error',
      });
    } finally {
      setIsBulkValidModalOpenFree(false);
    }
  };


  const openBulkValidModalFree = (itemId) => {
    setItemToBulkValidFree(itemId);
    setIsBulkValidModalOpenFree(true);
  };
  const closeBulkValidModalFree = () => {
    setIsBulkValidModalOpenFree(false);
    setItemToBulkValidFree(null);
  };

  const handleSingleValidation = async (itemId) => {
    const data = {
      user_id: userID,
      phone_id: itemId,
    };

    try {
      const response = await fetch(
        `${baseUrl}api/phone-validator/validate-number-id/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${userToken}`,
          },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to validate the item');
      }

      // Refresh the data after deletion
      await fetchData();
      setAlert({ message: 'Item validated successfully', type: 'success' });
    } catch (error) {
      console.error('Error validating item:', error);
      setAlert({
        message: 'An error occurred while validating the item',
        type: 'error',
      });
    } finally {
      setIsSingleValidationModalOpen(false);
      setItemToSingleValidation(null);
    }
  };

  const openSingleValidationModal = (itemId) => {
    setItemToSingleValidation(itemId);
    setIsSingleValidationModalOpen(true);
  };

  const closeSingleValidationModal = () => {
    setIsSingleValidationModalOpen(false);
    setItemToSingleValidation(null);
  };

  const handleSingleValidation2 = async (itemId) => {
    const data = {
      user_id: userID,
      phone_id: itemId,
    };

    try {
      const response = await fetch(
        `${baseUrl}api/phone-validator/validate-number-id-quality/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${userToken}`,
          },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to validate the item');
      }

      // Refresh the data after deletion
      await fetchData();
      setAlert({ message: 'Item validated successfully', type: 'success' });
    } catch (error) {
      console.error('Error validating item:', error);
      setAlert({
        message: 'An error occurred while validating the item',
        type: 'error',
      });
    } finally {
      setIsSingleValidationModalOpen2(false);
      setItemToSingleValidation2(null);
    }
  };

  const openSingleValidationModal2 = (itemId) => {
    setItemToSingleValidation2(itemId);
    setIsSingleValidationModalOpen2(true);
  };

  const closeSingleValidationModal2 = () => {
    setIsSingleValidationModalOpen2(false);
    setItemToSingleValidation2(null);
  };

  const openSingleValidationModalFree = (itemId) => {
    setItemToSingleValidationFree(itemId);
    setIsSingleValidationModalOpenFree(true);
  };

  const closeSingleValidationModalFree = () => {
    setIsSingleValidationModalOpenFree(false);
    setItemToSingleValidationFree(null);
  };

  const handleSingleValidationFree = async (itemId) => {
    const data = {
      user_id: userID,
      phone_id: itemId,
    };

    try {
      const response = await fetch(
        `${baseUrl}api/phone-validator/validate-number-id-free/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${userToken}`,
          },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to validate the item');
      }

      // Refresh the data after deletion
      await fetchData();
      setAlert({ message: 'Item validated successfully', type: 'success' });
    } catch (error) {
      console.error('Error validating item:', error);
      setAlert({
        message: 'An error occurred while validating the item',
        type: 'error',
      });
    } finally {
      setIsSingleValidationModalOpenFree(false);
      setItemToSingleValidationFree(null);
    }
  };

  // Handler for submitting the clear request
  const handleClearAllSubmit = async () => {
    try {
      // Here you can make a request to the server
      const response = await fetch(
        `${baseUrl}api/phone-generator/clear-numbers/?user_id=${userID}&project_id=${projectID}`,
        {
          method: 'GET', // assuming you're using POST
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${userToken}`,
          },
        },
      );

      if (response.ok) {
        setAlert({
          message: 'All numbers cleared successfully!',
          type: 'success',
        });
        await fetchData();
      } else {
        setAlert({
          message: 'Something went wrong. Please try again.',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Error:', error);

      setAlert({
        message: 'An error occurred while clearing numbers.',
        type: 'error',
      });
    } finally {
      closeModal(); // Close the modal after submission
    }
  };

  // Handler for opening the modal
  const openModal = () => {
    setIsModalOpen(true);
  };

  // Handler for closing the modal
  const closeModal = () => {
    setIsModalOpen(false);
  };

  // Handler for opening the modal
  const openDeleteModal = () => {
    setIsModalOpenDelete(true);
  };

  // Handler for closing the modal
  const closeDeleteModal = () => {
    setIsModalOpenDelete(false);
  };



    // Handler for submitting the clear request
    const handleDeleteAllSubmit = async () => {
      try {
        // Here you can make a request to the server
        const response = await fetch(
          `${baseUrl}api/phone-generator/delete-all/?user_id=${userID}&project_id=${projectID}`,
          {
            method: 'GET', // assuming you're using POST
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Token ${userToken}`,
            },
          },
        );
  
        if (response.ok) {
          setAlert({
            message: 'All numbers deleted successfully!',
            type: 'success',
          });
          await fetchData();
        } else {
          setAlert({
            message: 'Something went wrong. Please try again.',
            type: 'error',
          });
        }
      } catch (error) {
        console.error('Error:', error);
  
        setAlert({
          message: 'An error occurred while deleting numbers.',
          type: 'error',
        });
      } finally {
        closeDeleteModal(); // Close the modal after submission
      }
    };





  // Toggle select/deselect individual number
  const handleSelect = (numberId) => {
    setSelectedNumbers(
      (prevSelected) =>
        prevSelected.includes(numberId)
          ? prevSelected.filter((id) => {
              return id !== numberId;
            }) // Deselect
          : [...prevSelected, numberId], // Select
    );
  };

  // Handler for submitting the clear request
  const handleDeleteSelected = async () => {
    if (selectedNumbers.length === 0) {
      setInputError('No numbers selected!');
      setAlert({
        message: 'No numbers selected!',
        type: 'error',
      });

      return;
    }
    try {
      // Here you can make a request to the server
      const response = await fetch(
        `${baseUrl}api/phone-generator/delete-numbers/?user_id=${userID}`,
        {
          method: 'POST', // assuming you're using POST
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${userToken}`,
          },
          body: JSON.stringify({ selectedNumbers }),
        },
      );

      if (response.ok) {
        setAlert({
          message: 'All numbers cleared successfully!',
          type: 'success',
        });
        await fetchData();
        setSelectedNumbers([]);
      } else {
        setAlert({
          message: 'Something went wrong. Please try again.',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Error:', error);

      setAlert({
        message: 'An error occurred while clearing numbers.',
        type: 'error',
      });
    } finally {
      closeModal(); // Close the modal after submission
    }
  };

  const closeAlert = () => {
    setAlert({ message: '', type: '' });
  };

  return (
    <div className="rounded-sm border border-stroke  shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="py-6 px-4 md:px-6 xl:px-7.5">
        <h4 className="text-xl font-semibold text-black dark:text-white">
          All Numbers - {itemCount}
        </h4>


        
      {error && <p className="text-red-500 mt-2">{error}</p>}
      {validationMessage && (
        <p className="text-green-500 mt-2">{validationMessage}</p>
      )}


        {inputError && (
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-3"
            role="alert"
          >
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline"> {inputError}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-7 gap-5 py-6 px-4 md:px-6 xl:px-7.5">
        <input
          type="text"
          placeholder="Search here"
          className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Link to={'/generate-numbers/'}>
          <button className="flex w-full justify-center rounded bg-primary p-3 font-medium text-gray hover:bg-opacity-90">
            Generate No.
          </button>
        </Link>


          
          <button
            className="flex justify-center rounded bg-primary p-3 font-medium text-gray hover:bg-opacity-90"
            onClick={() => openBulkValidModalFree('')}
            disabled={loading}
          >
            {loading ? 'Validating...' : 'Free (B)'}
          </button>

          <button
            className="flex justify-center rounded bg-primary p-3 font-medium text-gray hover:bg-opacity-90"
            onClick={() => openBulkValidModal('')}
            disabled={loading}
          >
            {loading ? 'Validating...' : 'Abst (B)'}
          </button>

          <button
            className="flex justify-center rounded bg-primary p-3 font-medium text-gray hover:bg-opacity-90"
            onClick={() => openBulkValidModal2('')}
            disabled={loading}
          >
            {loading ? 'Validating...' : 'IPQ (B)'}
          </button>

          <button
            className="flex justify-center rounded bg-primary p-3 font-medium text-gray hover:bg-opacity-90"
            onClick={openModal}
          >
            Clear Numbers
          </button>
          <button
            className="flex justify-center rounded bg-primary p-3 font-medium text-gray hover:bg-opacity-90"
            onClick={openDeleteModal}
          >
            Delete All Numbers
          </button>
       
      </div>

      <div className="container mb-3">
        <div className="flex justify-between items-center mb-4 mx-5">
          {selectedNumbers.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="bg-red-600 text-white py-1 text-xs px-6 rounded hover:bg-red-700"
              disabled={loading || selectedNumbers.length === 0}
            >
              Delete Selected
            </button>
          )}
          {selectedNumbers.length > 0 && (
            <span className="text-gray-600">
              {selectedNumbers.length} selected
            </span>
          )}
        </div>

        <div className="grid grid-cols-8 border-t border-stroke py-4.5 px-4 dark:border-strokedark sm:grid-cols-8 md:px-6 2xl:px-7.5">
          <div className="col-span-1 flex items-center">
            <p className="font-medium">Phone Number</p>
          </div>
          <div className="col-span-1 flex items-center">
            <p className="font-medium">Valid</p>
          </div>
          <div className="col-span-1 flex items-center">
            <p className="font-medium">Carrier</p>
          </div>
          <div className="col-span-1 flex items-center">
            <p className="font-medium">Location</p>
          </div>
          <div className="col-span-1 flex items-center">
            <p className="font-medium">Type</p>
          </div>
          <div className="col-span-1 flex items-center">
            <p className="font-medium">Country</p>
          </div>
          <div className="col-span-2 flex items-center">
            <p className="font-medium">Actions</p>
          </div>
        </div>

        {numbers?.map((number) => (
          <div
            className="grid grid-cols-8 border-t border-stroke py-4.5 px-4 dark:border-strokedark sm:grid-cols-8 md:px-6 2xl:px-7.5 hover:bg-graydark "
            key={number?.id || 'default-key'}
          >
            <div className="col-span-1 flex items-center">
              <input
                type="checkbox"
                checked={selectedNumbers.includes(number.id)}
                onChange={() => handleSelect(number.id)}
                className="mr-2 "
              />
              <p className="text-sm text-black dark:text-white">
                {number?.phone_number
                  ? truncateText(number.phone_number, 50)
                  : '-'}
              </p>
            </div>
            <div className="col-span-1 flex items-center">
              <p
                className={`text-sm px-4 py-2 rounded ${
                  number?.valid_number
                    ? 'bg-green text-white'
                    : number?.valid_number === null
                    ? 'bg-gray-400 text-white'
                    : 'bg-red-600 text-white'
                } dark:text-white`}
              >
                {number?.valid_number === null
                  ? 'None'
                  : number?.valid_number
                  ? 'Valid'
                  : 'Invalid'}
              </p>
            </div>
            <div className="col-span-1 flex items-center">
              <p className="text-sm text-black dark:text-white">
                {number?.carrier ? truncateText(number.carrier, 50) : '-'}
              </p>
            </div>
            <div className="col-span-1 flex items-center">
              <p className="text-sm text-black dark:text-white">
                {number?.location ? truncateText(number.location, 50) : '-'}
              </p>
            </div>
            <div className="col-span-1 flex items-center">
              <p className="text-sm text-black dark:text-white">
                {number?.type ? truncateText(number.type, 50) : '-'}
              </p>
            </div>
            <div className="col-span-1 flex items-center">
              <p className="text-sm text-black dark:text-white">
                {number?.country_name
                  ? truncateText(number.country_name, 50)
                  : '-'}
              </p>
            </div>
            <div className="col-span-2 flex items-center gap-3">
              <button
                className="flex w-full justify-center rounded bg-primary p-3 font-medium text-gray hover:bg-opacity-90"
                onClick={() => openSingleValidationModalFree(number.id)}
                disabled={loading}
              >
                Free
              </button>
              <button
                className="flex w-full justify-center rounded bg-primary p-3 font-medium text-gray hover:bg-opacity-90"
                onClick={() => openSingleValidationModal(number.id)}
                disabled={loading}
              >
                Abst
              </button>
              <button
                className="flex w-full justify-center rounded bg-primary p-3 font-medium text-gray hover:bg-opacity-90"
                onClick={() => openSingleValidationModal2(number.id)}
                disabled={loading}
              >
                IPQ
              </button>
            </div>
          </div>
        ))}
      </div>
      <Pagination
        pagination={{
          page_number: page,
          total_pages: totalPages,
          next: page < totalPages ? page + 1 : null,
          previous: page > 1 ? page - 1 : null,
        }}
        setPage={setPage}
      />

      <SingleValidationConfirmationModal
        isOpen={isSingleValidationModalOpen}
        itemId={itemToSingleValidation}
        onConfirm={handleSingleValidation}
        onCancel={closeSingleValidationModal}
      />

      <SingleValidationConfirmationModal
        isOpen={isSingleValidationModalOpen2}
        itemId={itemToSingleValidation2}
        onConfirm={handleSingleValidation2}
        onCancel={closeSingleValidationModal2}
      />

      <SingleValidationConfirmationModal
        isOpen={isSingleValidationModalOpenFree}
        itemId={itemToSingleValidationFree}
        onConfirm={handleSingleValidationFree}
        onCancel={closeSingleValidationModalFree}
      />

      <BulkValidConfirmationModal
            loading={loading}

        isOpen={isBulkValidCModalOpen}
        itemId={itemToBulkValid}
        onConfirm={validateNumbers}
        onCancel={closeBulkValidModal}
      />
      <BulkValidConfirmationModal
            loading={loading}

        isOpen={isBulkValidCModalOpen2}
        itemId={itemToBulkValid2}
        onConfirm={validateNumbers2}
        onCancel={closeBulkValidModal2}
      />
      <BulkValidConfirmationModal
      loading={loading}
        isOpen={isBulkValidCModalOpenFree}
        itemId={itemToBulkValidFree}
        onConfirm={validateNumbersFree}
        onCancel={closeBulkValidModalFree}
      />

      {/* Modal Component */}
      <ClearAllModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={handleClearAllSubmit}
      />
      <DeleteAllModal
        isOpen={isModalOpenDelete}
        onClose={closeDeleteModal}
        onSubmit={handleDeleteAllSubmit}
      />

      {/* Render the alert */}
      <Alert2 message={alert.message} type={alert.type} onClose={closeAlert} />
    </div>
  );
};

export default AllNumbers;

const ClearAllModal = ({ isOpen, onClose, onSubmit }) => {
  if (!isOpen) return null; // If modal is not open, return nothing.

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h3 className="text-lg font-medium text-gray-900">Clear All Numbers</h3>
        <p className="mt-4 text-sm text-gray-700">
          Are you sure you want to clear all numbers? This action cannot be
          undone and will leave only valid numbers.
        </p>
        <div className="mt-6 flex justify-end space-x-4">
          <button
            className="bg-gray-300 text-gray-800 py-2 px-4 rounded"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="bg-red-600 text-white py-2 px-4 rounded"
            onClick={onSubmit}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};




const DeleteAllModal = ({ isOpen, onClose, onSubmit }) => {
  if (!isOpen) return null; // If modal is not open, return nothing.

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h3 className="text-lg font-medium text-gray-900">Clear All Numbers</h3>
        <p className="mt-4 text-sm text-gray-700">
          Are you sure you want to Delete all numbers? This action cannot be
          undone and will remove all generated numbers in the project.
        </p>
        <div className="mt-6 flex justify-end space-x-4">
          <button
            className="bg-gray-300 text-gray-800 py-2 px-4 rounded"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="bg-red-600 text-white py-2 px-4 rounded"
            onClick={onSubmit}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};
