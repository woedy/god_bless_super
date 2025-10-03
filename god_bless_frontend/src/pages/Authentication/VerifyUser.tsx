import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import { baseUrl } from '../../constants';

const VerifyUser: React.FC = () => {
  const [emailToken, setEmailToken] = useState('');

  const [inputError, setInputError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user_email } = useParams();

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear any previous error
    setInputError('');

    if (emailToken === '') {
      setInputError('EmailToken required.');
      return;
    }

    // Create FormData object
    const formData = new FormData();

    formData.append('email', user_email);
    formData.append('email_token', emailToken);

    // Make a POST request to the server
    const url = baseUrl + 'api/accounts/verify-user-email/';

    try {
      setLoading(true);
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      // Log formData
      const formDataObject = {};
      formData.forEach((value, key) => {
        formDataObject[key] = value;
      });
      console.log('formData:', formDataObject);

      const data = await response.json();

      if (!response.ok) {
        console.log('############################33');
        console.log(data.errors);
        throw new Error(data.message);
      }

      // Registration successful
      console.log('User verified successfully');
      navigate('/signin'); // Navigate to success page
    } catch (error) {
      console.error('Error verifying user:', error.message);
      if (error.message === 'Errors' && error.errors) {
        setInputError(Object.values(error.errors).flat().join('\n'));
      } else {
        setInputError('Failed to verify');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Breadcrumb pageName="Verify User" />

      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="flex flex-wrap items-center">
          <div className="hidden w-full xl:block xl:w-1/2 bg-primary">
            <div className="py-17.5 px-26 text-center">
              <h2 className="text-3xl font-bold text-white mb-2">
                God Bless America
              </h2>
              <p className="2xl:px-15 text-xl text-white mb-2">
                God Bless America
              </p>
              <p className="2xl:px-15 text-white">Open Source Inteligence</p>
            </div>
          </div>

          <div className="w-full border-stroke dark:border-strokedark xl:w-1/2 xl:border-l-2">
            <div className="w-full p-4 sm:p-12.5 xl:p-17.5">
              <h2 className="mb-9 text-2xl font-bold text-black dark:text-white sm:text-title-xl2">
                Verify Uer
              </h2>

              {inputError && (
                <div
                  className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-3"
                  role="alert"
                >
                  <strong className="font-bold">Error!</strong>
                  <span className="block sm:inline"> {inputError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-2">
                  <div className="mb-4">
                    <label className="mb-2.5 block font-medium text-black dark:text-white">
                      EmailToken
                    </label>
                    <div className="relative">
                      <input
                        id="emailToken"
                        name="emailToken"
                        type="number"
                        value={emailToken}
                        onChange={(e) => setEmailToken(e.target.value)}
                        placeholder="Email Token Here"
                        className="w-full rounded-lg border border-stroke bg-transparent py-4 pl-6 pr-10 text-black outline-none focus:border-primary focus-visible:shadow-none dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                      />

                      <span className="absolute right-4 top-4">
                        <svg
                          className="fill-current"
                          width="22"
                          height="22"
                          viewBox="0 0 22 22"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <g opacity="0.5">
                            <path
                              d="M11.0008 9.52185C13.5445 9.52185 15.607 7.5281 15.607 5.0531C15.607 2.5781 13.5445 0.584351 11.0008 0.584351C8.45703 0.584351 6.39453 2.5781 6.39453 5.0531C6.39453 7.5281 8.45703 9.52185 11.0008 9.52185ZM11.0008 2.1656C12.6852 2.1656 14.0602 3.47185 14.0602 5.08748C14.0602 6.7031 12.6852 8.00935 11.0008 8.00935C9.31641 8.00935 7.94141 6.7031 7.94141 5.08748C7.94141 3.47185 9.31641 2.1656 11.0008 2.1656Z"
                              fill=""
                            />
                            <path
                              d="M13.2352 11.0687H8.76641C5.08828 11.0687 2.09766 14.0937 2.09766 17.7719V20.625C2.09766 21.0375 2.44141 21.4156 2.88828 21.4156C3.33516 21.4156 3.67891 21.0719 3.67891 20.625V17.7719C3.67891 14.9531 5.98203 12.6156 8.83516 12.6156H13.2695C16.0883 12.6156 18.4258 14.9187 18.4258 17.7719V20.625C18.4258 21.0375 18.7695 21.4156 19.2164 21.4156C19.6633 21.4156 20.007 21.0719 20.007 20.625V17.7719C19.9039 14.0937 16.9133 11.0687 13.2352 11.0687Z"
                              fill=""
                            />
                          </g>
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mb-5">
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
                    <input
                      type="submit"
                      value="Verify"
                      className="w-full cursor-pointer rounded-lg border border-primary bg-primary p-4 text-white transition hover:bg-opacity-90"
                    />
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default VerifyUser;
