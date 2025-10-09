import { useCallback, useEffect, useState } from 'react';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import { baseUrl, userID, username, userToken } from '../../constants';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const SmsSender = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [senderName, setSenderName] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [smtp, setSmtp] = useState('');
  const [provider, setProvider] = useState('');

  const [carriers, setCarriers] = useState([]);
  const [smtps, setSMTPs] = useState([]);

  const [inputError, setInputError] = useState('');
  const [isLoading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${baseUrl}api/sms-sender/get-smtps-providers/?&user_id=${userID}`,
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
      setCarriers(data.data.providers);

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

    if (subject === '') {
      setInputError('Subject is required.');
      setLoading(false);
      return;
    }

    if (senderName === '') {
      setInputError('Send Name required.');
      setLoading(false);
      return;
    }
    if (message === '') {
      setInputError('Message required.');
      setLoading(false);
      return;
    }

    if (phoneNumber === '') {
      setInputError('Phone number required.');
      setLoading(false);

      return;
    }
    if (smtp === '') {
      setInputError('SMTP required.');
      setLoading(false);
      return;
    }
    if (provider === '') {
      setInputError('Provider required.');
      setLoading(false);
      return;
    }

    // Clear any previous error
    setInputError('');

    // Create FormData object
    const formData = new FormData();

    formData.append('user_id', userID);
    formData.append('v_phone_number', phoneNumber);
    formData.append('sender_name', senderName);
    formData.append('subject', subject);
    formData.append('message', message);
    formData.append('smtp_id', smtp);
    formData.append('provider', provider);

    // Make a POST request to the server
    const url = baseUrl + 'api/sms-sender/send-single-sms/';
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

      // SMS sent successfully
      console.log('SMS sent successfully');
      toast.success('SMS sent successfully!');
      
      setPhoneNumber('');
      setSenderName('');
      setSubject('');
      setMessage('');
      setSmtp('');
      setProvider('');
    } catch (error) {
      console.error('Error updating data:', error.message);
      // Check if the error comes from server validation
      if (error.message === 'Errors' && data && data.errors) {
        setInputError(Object.values(data.errors).flat().join('\n'));
      } else {
        setInputError('Failed to send sms.');
      }
    } finally {
      setLoading(false);
    }
  };



  return (
    <>
      <div className="mx-auto max-w-350">
        <Breadcrumb pageName="SMS Sender" />

        <div className="mb-6 flex justify-end">
          <button
            onClick={() => navigate('/sms-sender/bulk')}
            className="rounded bg-primary px-6 py-3 text-white hover:bg-opacity-90"
          >
            Send Bulk SMS
          </button>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div className="col-span-2 xl:col-span-2">
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="border-b border-stroke py-4 px-7 dark:border-strokedark">
                <h3 className="font-medium text-black dark:text-white">
                  Send SMS
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
                  <div className="grid grid-cols-2 gap-8">
                    <div className="col-span-1 xl:col-span-1">
                
                      <div className="mb-5.5">
                        <label
                          className="mb-3 block text-sm font-medium text-black dark:text-white"
                          htmlFor="sname"
                        >
                          Sender Name
                        </label>
                        <input
                          className="w-full rounded border border-stroke bg-gray py-3 px-4.5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                          type="text"
                          name="sname"
                          id="sname"
                          placeholder=""
                          value={senderName}
                          onChange={(e) => setSenderName(e.target.value)}
                        />
                      </div>

                      <div className="mb-5.5">
                        <label
                          className="mb-3 block text-sm font-medium text-black dark:text-white"
                          htmlFor="subject"
                        >
                          Subject
                        </label>
                        <input
                          className="w-full rounded border border-stroke bg-gray py-3 px-4.5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                          type="text"
                          name="subject"
                          id="subject"
                          placeholder=""
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                        />
                      </div>

                      <div className="mb-5.5">
                        <label
                          className="mb-3 block text-sm font-medium text-black dark:text-white"
                          htmlFor="message"
                        >
                          Message
                        </label>
                        <textarea
                          className="w-full rounded border border-stroke bg-gray py-3 px-4.5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                          name="message"
                          id="message"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="col-span-1 xl:col-span-1">
                      <div className="mb-5.5">
                        <label
                          className="mb-3 block text-sm font-medium text-black dark:text-white"
                          htmlFor="phonenumber"
                        >
                          Phone Number (+ 1 232 172 8297)
                        </label>
                        <input
                          className="w-full rounded border border-stroke bg-gray py-3 px-4.5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                          type="text"
                          name="phonenumber"
                          id="phonenumber"
                          placeholder=""
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                        />
                      </div>

                      <div className="mb-5.5">
                        <div className="">
                          <label
                            className="mb-3 block text-sm font-medium text-black dark:text-white"
                            htmlFor="smtps"
                          >
                            Select SMTP
                          </label>
                          <select
                            id="smtps"
                            value={smtp}
                            onChange={(e) => setSmtp(e.target.value)}
                            className="w-full rounded-md border-2 border-stroke bg-transparent py-3 px-5 text-black dark:border-strokedark dark:bg-boxdark dark:text-white dark:focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary transition duration-200 ease-in-out hover:bg-gray-100 dark:hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
                          >
                            <option value="">Select SMTP</option>
                            {smtps.map((smtpOption) => (
                              <option
                                key={smtpOption.id}
                                value={smtpOption.id}
                                className="hover:bg-graydark dark:hover:bg-graydark"
                              >
                                {smtpOption.host}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="mb-5.5">
                        <div className="">
                          <label
                            className="mb-3 block text-sm font-medium text-black dark:text-white"
                            htmlFor="smtps"
                          >
                            Providers
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
                      </div>
                    </div>

                    <div></div>

                    <div className="flex justify-end gap-4.5">
                      <button className="flex justify-center rounded border border-stroke py-2 px-6 font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white">
                        Cancel
                      </button>

                      {!isLoading ? (
                        <button
                          className="flex justify-center rounded bg-primary py-2 px-6 font-medium text-gray hover:bg-opacity-90"
                          type="submit"
                        >
                          Send SMS
                        </button>
                      ) : (
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
                      )}
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div className="col-span-2 xl:col-span-2">
            <div className="">
              <div className="p-7">
                <div className="grid grid-cols-2 gap-8">
                  <div className="col-span-1 xl:col-span-1">
                    <h3 className="font-medium text-black dark:text-white">
                      Inbox Tips
                    </h3>
                    <div className="p-4">
                      <ul className="list-disc pl-5 space-y-1">
                        <li className="text-green-500 hover:text-green-700">
                          User link shortner for all clickable links
                        </li>

                        <li className="text-green-500 hover:text-green-700">
                          Don't encrypt your letter
                        </li>
                        <li className="text-green-500 hover:text-green-700">
                          Avoid the use of flagged words
                        </li>
                        <li className="text-green-500 hover:text-green-700">
                          Don't spoof as primary company domain
                        </li>
                        <li className="text-green-500 hover:text-green-700">
                          User Antibots on your panels
                        </li>
                        <li className="text-green-500 hover:text-green-700">
                          Make sure your letter has a clean spam score
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="col-span-1 xl:col-span-1">
                    <h3 className="font-medium text-black dark:text-white">
                      Macros
                    </h3>

                    <div className="p-4">
                      <ul className="list-disc pl-5 space-y-1">
                        <li className="text-green-500 hover:text-green-700">
                          <span className="text-red-600">@REF@</span> :
                          Generate random reference number
                        </li>
                        <li className="text-green-500 hover:text-green-700">
                          <span className="text-red-600">@TICKET@</span> :
                          Generate random ticket number
                        </li>

                        <li className="text-green-500 hover:text-green-700">
                          <span className="text-red-600">@FIRST@</span> :
                          Generate random first name
                        </li>

                        <li className="text-green-500 hover:text-green-700">
                          <span className="text-red-600">@LAST@</span> :
                          Generate random last name
                        </li>

                        <li className="text-green-500 hover:text-green-700">
                          <span className="text-red-600">@TIME@</span> :
                          Current time
                        </li>

                        <li className="text-green-500 hover:text-green-700">
                          <span className="text-red-600">@YEAR@</span> :
                          Current year
                        </li>
                        <li className="text-green-500 hover:text-green-700">
                          <span className="text-red-600">@MONTH@</span> :
                          Current month
                        </li>
                        <li className="text-green-500 hover:text-green-700">
                          <span className="text-red-600">@DAY@</span> :
                          Current day
                        </li>
                      </ul>
                    </div>
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

export default SmsSender;
