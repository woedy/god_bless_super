import React, { useCallback, useEffect, useState } from 'react';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import { baseUrl, userID, userToken } from '../../constants';

const PhoneNumberCSVGenerator = () => {
  const [code, setCode] = useState('');
  const [phoneNumbers, setPhoneNumbers] = useState('');
  const [phoneNumbers2, setPhoneNumbers2] = useState('');
  const [phoneList, setPhoneList] = useState([]);
  const [phoneList2, setPhoneList2] = useState([]);
  const [inputError, setInputError] = useState('');
  const [loading, setLoading] = useState(false);


  const [provider, setProvider] = useState('');

  const [carriers, setCarriers] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setInputError('');
    try {
      const response = await fetch(
        `${baseUrl}api/phone-generator/download-numbers/?user_id=${userID}&carrier=${provider}&code=${code}`,
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
      setPhoneList(data.data.numbers);
      setCarriers(data.data.providers);
      console.log('Phone list data:', data.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      setInputError('Error fetching data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [baseUrl, userID, userToken, provider, code]);

  useEffect(() => {
    fetchData();
  }, [ code, fetchData, provider]);

  // Handle phone number input change
  const handlePhoneNumbersChange = (e) => {
    setPhoneNumbers2(e.target.value);
  };

  // Add phone numbers to the list
  const addPhoneNumbersToList = () => {
    const newPhoneList = phoneNumbers2
      .split('\n')
      .map((num) => num.trim())
      .filter((num) => num !== '');
    setPhoneList2(newPhoneList);
    setPhoneNumbers2(''); // Clear input after adding
  };

  // Generate and download CSV using PapaParse
  const generateCSV = () => {
    if (phoneList.length > 0) {
      // Convert the phone number list into an array of objects
      const formattedData = phoneList.map((num) => ({ phoneNumber: num }));

      // Convert to CSV using PapaParse
      const csv = Papa.unparse(formattedData);

      // Save the CSV file
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      saveAs(blob, 'phone_numbers.csv');
    } else {
      alert('No phone numbers to export.');
    }
  };
  const generateCSV2 = () => {
    if (phoneList2.length > 0) {
      // Convert the phone number list into an array of objects
      const formattedData = phoneList2.map((num) => ({ phoneNumber: num }));

      // Convert to CSV using PapaParse
      const csv = Papa.unparse(formattedData);

      // Save the CSV file
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      saveAs(blob, 'phone_numbers.csv');
    } else {
      alert('No phone numbers to export.');
    }
  };

  return (
    <>
      <div className="mx-auto max-w-370">
        <Breadcrumb
          pageName="Generate Numbers CSV
"
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-1 xl:col-span-1">
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="border-b border-stroke py-4 px-7 dark:border-strokedark">
                <h3 className="font-medium text-black dark:text-white">
                  Generate from my account
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
                <div className="mb-5.5">
                  <p className="mb-2 text-xs">Filter</p>
                  <div className="grid grid-cols-2 gap-5 justify-center ">
                    <div className="">
                      <label
                        className="mb-3 block text-sm font-medium text-black dark:text-white"
                        htmlFor="carrier"
                      >
                        Select Carrier
                      </label>
                  
                      <select
                            id="providers"
                            value={provider}
                            onChange={(e) => setProvider(e.target.value)}
                            className="w-full rounded-md border-2 border-stroke bg-transparent py-3 px-5 text-black dark:border-strokedark dark:bg-boxdark dark:text-white dark:focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary transition duration-200 ease-in-out hover:bg-gray-100 dark:hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
                          >
                            <option value="">Select Provider</option>

                            {carriers.map((prov) => (
                              <option
                                key={prov}
                                value={prov}
                                className="hover:bg-graydark dark:hover:bg-graydark"
                              >
                                {prov}
                              </option>
                            ))}
                          </select>


                    </div>

                    <div className="">
                      <label
                        className="mb-3 block text-sm font-medium text-black dark:text-white"
                        htmlFor="areaCode"
                      >
                        Area Code
                      </label>
                      <input
                        type="text"
                        id="areaCode"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="Enter area code"
                        className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-4.5">
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
                      onClick={generateCSV}
                    >
                      Download CSV
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Display Phone Numbers */}
            {phoneList.length > 0 && (
              <div className="mt-6">
                <h4 className="text-xl font-semibold text-black dark:text-white">
                  Phone Numbers
                </h4>
                <ul className="mt-4 space-y-2">
                  {phoneList.map((phone, index) => (
                    <li
                      key={index}
                      className="flex justify-between p-3 border border-gray-300 dark:border-gray-700 rounded-md"
                    >
                      <span>{phone}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="col-span-1 xl:col-span-1">
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="col-span-1 xl:col-span-1">
                <div className="max-w-lg mx-auto p-4">
                  <h1 className="text-2xl font-bold text-center mb-4">
                    Phone Number CSV Generator
                  </h1>

                  {/* Phone number input area */}
                  <textarea
                    className="w-full p-2 border border-gray-300 rounded mb-4"
                    placeholder="Enter phone numbers (one per line)"
                    value={phoneNumbers2}
                    onChange={handlePhoneNumbersChange}
                    rows="6"
                  ></textarea>

                  <button
                    onClick={addPhoneNumbersToList}
                    className="w-full bg-blue-500 text-white py-2 rounded mb-4 hover:bg-blue-700"
                  >
                    Add Phone Numbers
                  </button>

                  {/* Generate CSV Button */}
                  <button
                    onClick={generateCSV2}
                    className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-700"
                  >
                    Generate CSV
                  </button>

                  <h2 className="text-lg font-semibold mb-2">Phone Numbers:</h2>
                  <ul className="list-disc pl-5 mb-4">
                    {phoneList2.map((num, index) => (
                      <li key={index} className="text-gray-700">
                        {num}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PhoneNumberCSVGenerator;
