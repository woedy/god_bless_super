import { useState } from 'react';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import userThree from '../../images/user/user-03.png';
import { baseUrl, getUserID, getUserToken } from '../../constants';
import { Link, useNavigate } from 'react-router-dom';

const ValidateNumber = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneNumber2, setPhoneNumber2] = useState('');
  const [validationResponse, setValidationResponse] = useState({});
  const [validationResponse2, setValidationResponse2] = useState({});

  const [inputError, setInputError] = useState('');
  const [inputError2, setInputError2] = useState('');
  const [loading, setLoading] = useState(false);
  const [loading2, setLoading2] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (phoneNumber === '') {
      setInputError('Phone number required.');
      return;
    }

    if (!/^\d{11}$/.test(phoneNumber)) {
      setInputError('Area Code must be exactly 11 digits. eg. 14155091612');
      return;
    }

    // Clear any previous error
    setInputError('');

    // Create FormData object
    const formData = new FormData();
    formData.append('phone', phoneNumber);

    // Make a POST request to the server
    const url = baseUrl + 'api/phone-validator/validate-number/';
    let data; // Declare data outside of the try block

    try {
      setLoading(true);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Token ${getUserToken()}`,
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
      console.log('Number validated successfully');
      //navigate('/all-numbers'); // Navigate to success page

      console.log(data.data);

      setValidationResponse(data.data);
    } catch (error) {
      console.error('Error generating numbers:', error.message);
      // Check if the error comes from server validation
      if (error.message === 'Errors' && data && data.errors) {
        setInputError(Object.values(data.errors).flat().join('\n'));
      } else {
        setInputError('Failed to validate numbers.');
      }
    } finally {
      setLoading(false);
    }
  };



  
  const handleSubmit2 = async (e) => {
    e.preventDefault();

    if (phoneNumber2 === '') {
      setInputError2('Phone number required.');
      return;
    }

    if (!/^\d{11}$/.test(phoneNumber2)) {
      setInputError2('Area Code must be exactly 11 digits. eg. 14155091612');
      return;
    }



    
    // Clear any previous error
    setInputError2('');

    // Create FormData object
    const formData = new FormData();
    formData.append('user_id', getUserID() || '');
    formData.append('phone', phoneNumber2);

    // Make a POST request to the server
    const url = baseUrl + 'api/phone-validator/validate-number-quality/';
    let data; // Declare data outside of the try block

    try {
      setLoading2(true);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Token ${getUserToken()}`,
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
      console.log('Number validated successfully');
      //navigate('/all-numbers'); // Navigate to success page

      console.log(data.data);

      setValidationResponse2(data.data);
    } catch (error) {
      console.error('Error generating numbers:', error.message);
      // Check if the error comes from server validation
      if (error.message === 'Errors' && data && data.errors) {
        setInputError2(Object.values(data.errors).flat().join('\n'));
      } else {
        setInputError2('Failed to validate numbers.');
      }
    } finally {
      setLoading2(false);
    }
  };

  return (
    <>
      <div className="mx-auto max-w-270">
        <Breadcrumb pageName="Validate Number" />

        <div className="grid grid-cols-2 gap-1">
          <div className="col-span-1 xl:col-span-1">
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="border-b border-stroke py-4 px-7 dark:border-strokedark">
                <h3 className="font-medium text-black dark:text-white">
                  Validate Number (API-1)
                </h3>
              </div>

              {inputError && (
                <div
                  className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-3"
                  role="alert"
                >
                  <strong className="font-bold">Error!</strong>
                  <span className="block sm:inline"> {inputError}</span>
                </div>
              )}

              <div className="p-7">
                <form onSubmit={handleSubmit}>
                  <div className="mb-5.5">
                    <div className="grid grid-cols-2 gap-5 justify-center ">
                      <div className="">
                        <label
                          className="mb-3 block text-sm font-medium text-black dark:text-white"
                          htmlFor="phoneNumber"
                        >
                          Phone Number
                        </label>
                        <div className="relative">
                          <span className="absolute left-4.5 top-4">
                            <svg
                              className="fill-current"
                              width="20"
                              height="20"
                              viewBox="0 0 20 20"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <g opacity="0.8">
                                <path
                                  fillRule="evenodd"
                                  clipRule="evenodd"
                                  d="M3.72039 12.887C4.50179 12.1056 5.5616 11.6666 6.66667 11.6666H13.3333C14.4384 11.6666 15.4982 12.1056 16.2796 12.887C17.061 13.6684 17.5 14.7282 17.5 15.8333V17.5C17.5 17.9602 17.1269 18.3333 16.6667 18.3333C16.2064 18.3333 15.8333 17.9602 15.8333 17.5V15.8333C15.8333 15.1703 15.5699 14.5344 15.1011 14.0655C14.6323 13.5967 13.9964 13.3333 13.3333 13.3333H6.66667C6.00363 13.3333 5.36774 13.5967 4.8989 14.0655C4.43006 14.5344 4.16667 15.1703 4.16667 15.8333V17.5C4.16667 17.9602 3.79357 18.3333 3.33333 18.3333C2.8731 18.3333 2.5 17.9602 2.5 17.5V15.8333C2.5 14.7282 2.93899 13.6684 3.72039 12.887Z"
                                  fill=""
                                />
                                <path
                                  fillRule="evenodd"
                                  clipRule="evenodd"
                                  d="M9.99967 3.33329C8.61896 3.33329 7.49967 4.45258 7.49967 5.83329C7.49967 7.214 8.61896 8.33329 9.99967 8.33329C11.3804 8.33329 12.4997 7.214 12.4997 5.83329C12.4997 4.45258 11.3804 3.33329 9.99967 3.33329ZM5.83301 5.83329C5.83301 3.53211 7.69849 1.66663 9.99967 1.66663C12.3009 1.66663 14.1663 3.53211 14.1663 5.83329C14.1663 8.13448 12.3009 9.99996 9.99967 9.99996C7.69849 9.99996 5.83301 8.13448 5.83301 5.83329Z"
                                  fill=""
                                />
                              </g>
                            </svg>
                          </span>
                          <input
                            className="w-full rounded border border-stroke bg-gray py-3 pl-11.5 pr-4.5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                            id="phoneNumber"
                            name="phoneNumber"
                            type="number"
                            maxLength={3}
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="eg. 14155091612"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-4.5">
                    <button
                      className="flex justify-center rounded border border-stroke py-2 px-6 font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white"
                      type="submit"
                    >
                      Cancel
                    </button>

                    {loading ? (
                      <div
                        role="status"
                        className="flex flex-col items-center justify-center h-full space-y-4"
                      >
                        <svg
                          aria-hidden="true"
                          className="w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-green"
                          viewBox="0 0 100 101"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                            fill="currentColor"
                          />
                          <path
                            d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                            fill="currentFill"
                          />
                        </svg>
                        <span className="text-green">Loading...</span>
                      </div>
                    ) : (
                      <button
                        className="flex justify-center rounded bg-primary py-2 px-6 font-medium text-gray hover:bg-opacity-90"
                        type="submit"
                      >
                        Validate
                      </button>
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
                  Validate Number (API-2)
                </h3>
              </div>

              {inputError2 && (
                <div
                  className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-3"
                  role="alert"
                >
                  <strong className="font-bold">Error!</strong>
                  <span className="block sm:inline"> {inputError2}</span>
                </div>
              )}

              <div className="p-7">
                <form onSubmit={handleSubmit2}>
                  <div className="mb-5.5">
                    <div className="grid grid-cols-2 gap-5 justify-center ">
                      <div className="">
                        <label
                          className="mb-3 block text-sm font-medium text-black dark:text-white"
                          htmlFor="phoneNumber2"
                        >
                          Phone Number
                        </label>
                        <div className="relative">
                          <span className="absolute left-4.5 top-4">
                            <svg
                              className="fill-current"
                              width="20"
                              height="20"
                              viewBox="0 0 20 20"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <g opacity="0.8">
                                <path
                                  fillRule="evenodd"
                                  clipRule="evenodd"
                                  d="M3.72039 12.887C4.50179 12.1056 5.5616 11.6666 6.66667 11.6666H13.3333C14.4384 11.6666 15.4982 12.1056 16.2796 12.887C17.061 13.6684 17.5 14.7282 17.5 15.8333V17.5C17.5 17.9602 17.1269 18.3333 16.6667 18.3333C16.2064 18.3333 15.8333 17.9602 15.8333 17.5V15.8333C15.8333 15.1703 15.5699 14.5344 15.1011 14.0655C14.6323 13.5967 13.9964 13.3333 13.3333 13.3333H6.66667C6.00363 13.3333 5.36774 13.5967 4.8989 14.0655C4.43006 14.5344 4.16667 15.1703 4.16667 15.8333V17.5C4.16667 17.9602 3.79357 18.3333 3.33333 18.3333C2.8731 18.3333 2.5 17.9602 2.5 17.5V15.8333C2.5 14.7282 2.93899 13.6684 3.72039 12.887Z"
                                  fill=""
                                />
                                <path
                                  fillRule="evenodd"
                                  clipRule="evenodd"
                                  d="M9.99967 3.33329C8.61896 3.33329 7.49967 4.45258 7.49967 5.83329C7.49967 7.214 8.61896 8.33329 9.99967 8.33329C11.3804 8.33329 12.4997 7.214 12.4997 5.83329C12.4997 4.45258 11.3804 3.33329 9.99967 3.33329ZM5.83301 5.83329C5.83301 3.53211 7.69849 1.66663 9.99967 1.66663C12.3009 1.66663 14.1663 3.53211 14.1663 5.83329C14.1663 8.13448 12.3009 9.99996 9.99967 9.99996C7.69849 9.99996 5.83301 8.13448 5.83301 5.83329Z"
                                  fill=""
                                />
                              </g>
                            </svg>
                          </span>
                          <input
                            className="w-full rounded border border-stroke bg-gray py-3 pl-11.5 pr-4.5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                            id="phoneNumber2"
                            name="phoneNumber2"
                            type="number"
                            maxLength={3}
                            value={phoneNumber2}
                            onChange={(e) => setPhoneNumber2(e.target.value)}
                            placeholder="eg. 14155091612"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-4.5">
                    <button
                      className="flex justify-center rounded border border-stroke py-2 px-6 font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white"
                      type="submit"
                    >
                      Cancel
                    </button>

                    {loading2 ? (
                      <div
                        role="status"
                        className="flex flex-col items-center justify-center h-full space-y-4"
                      >
                        <svg
                          aria-hidden="true"
                          className="w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-green"
                          viewBox="0 0 100 101"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                            fill="currentColor"
                          />
                          <path
                            d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                            fill="currentFill"
                          />
                        </svg>
                        <span className="text-green">Loading...</span>
                      </div>
                    ) : (
                      <button
                        className="flex justify-center rounded bg-primary py-2 px-6 font-medium text-gray hover:bg-opacity-90"
                        type="submit"
                      >
                        Validate
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        
        
        
        
        
        
        </div>

        <div className="col-span-5 xl:col-span-2 mt-9">
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke py-4 px-7 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Results (API-1)
              </h3>

              <div className="grid grid-cols-8 border-t border-stroke py-4.5 px-4 dark:border-strokedark sm:grid-cols-8 md:px-6 2xl:px-7.5">
                <div className="col-span-1 flex items-center">
                  <p className="font-medium">Prefix</p>
                </div>

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
              </div>

              <div className="grid grid-cols-8 border-t border-stroke py-4.5 px-4 dark:border-strokedark sm:grid-cols-8 md:px-6 2xl:px-7.5 hover:bg-graydark">
                <div className="col-span-1 flex items-center">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <p className="text-sm text-black dark:text-white">
                      {validationResponse?.country?.prefix
                        ? validationResponse?.country?.prefix
                        : '-'}
                    </p>
                  </div>
                </div>

                <div className="col-span-1 flex items-center">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <p className="text-sm text-black dark:text-white">
                      {validationResponse?.phone
                        ? validationResponse.phone
                        : '-'}
                    </p>
                  </div>
                </div>

                <div className="col-span-1 flex items-center">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <p
                      className={`text-sm px-4 py-2 rounded ${
                        validationResponse?.valid
                          ? 'bg-green text-white'
                          : 'bg-red-600 text-white'
                      } dark:text-white`}
                    >
                      {validationResponse?.valid ? 'Valid' : 'Invalid'}
                    </p>
                  </div>
                </div>

                <div className="col-span-1 flex items-center">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <p className="text-sm text-black dark:text-white">
                      {validationResponse?.carrier
                        ? validationResponse?.carrier
                        : '-'}
                    </p>
                  </div>
                </div>

                <div className="col-span-1 flex items-center">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <p className="text-sm text-black dark:text-white">
                      {validationResponse?.location
                        ? validationResponse.location
                        : '-'}
                    </p>
                  </div>
                </div>

                <div className="col-span-1 flex items-center">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <p className="text-sm text-black dark:text-white">
                      {validationResponse?.type ? validationResponse.type : '-'}
                    </p>
                  </div>
                </div>

                <div className="col-span-1 flex items-center">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <p className="text-sm text-black dark:text-white">
                      {validationResponse?.country?.name
                        ? validationResponse?.country?.name
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>


        <div className="col-span-5 xl:col-span-2 mt-9">
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke py-4 px-7 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Results (API-2)
              </h3>

              <div className="grid grid-cols-8 border-t border-stroke py-4.5 px-4 dark:border-strokedark sm:grid-cols-8 md:px-6 2xl:px-7.5">
                <div className="col-span-1 flex items-center">
                  <p className="font-medium">Prefix</p>
                </div>

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
              </div>

              <div className="grid grid-cols-8 border-t border-stroke py-4.5 px-4 dark:border-strokedark sm:grid-cols-8 md:px-6 2xl:px-7.5 hover:bg-graydark">
                <div className="col-span-1 flex items-center">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <p className="text-sm text-black dark:text-white">
                      {validationResponse2?.country?.prefix
                        ? validationResponse2?.country?.prefix
                        : '-'}
                    </p>
                  </div>
                </div>

                <div className="col-span-1 flex items-center">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <p className="text-sm text-black dark:text-white">
                      {validationResponse2?.formatted
                        ? validationResponse2.formatted
                        : '-'}
                    </p>
                  </div>
                </div>

                <div className="col-span-1 flex items-center">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <p
                      className={`text-sm px-4 py-2 rounded ${
                        validationResponse2?.valid
                          ? 'bg-green text-white'
                          : 'bg-red-600 text-white'
                      } dark:text-white`}
                    >
                      {validationResponse2?.valid ? 'Valid' : 'Invalid'}
                    </p>
                  </div>
                </div>

                <div className="col-span-1 flex items-center">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <p className="text-sm text-black dark:text-white">
                      {validationResponse2?.carrier
                        ? validationResponse2?.carrier
                        : '-'}
                    </p>
                  </div>
                </div>

                <div className="col-span-1 flex items-center">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <p className="text-sm text-black dark:text-white">
                      {validationResponse2?.city
                        ? validationResponse2.city
                        : '-'}
                    </p>
                  </div>
                </div>

                <div className="col-span-1 flex items-center">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <p className="text-sm text-black dark:text-white">
                      {validationResponse2?.line_type ? validationResponse2.line_type : '-'}
                    </p>
                  </div>
                </div>

                <div className="col-span-1 flex items-center">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <p className="text-sm text-black dark:text-white">
                      {validationResponse2?.country
                        ? validationResponse2?.country
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ValidateNumber;
