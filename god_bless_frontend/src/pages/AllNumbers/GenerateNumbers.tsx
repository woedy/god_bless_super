import { useState } from 'react';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import { baseUrl, projectID, userID, userToken } from '../../constants';
import { useNavigate } from 'react-router-dom';

const GenerateNumbers = () => {
  const [areaCode, setAreaCode] = useState('');
  const [size, setSize] = useState('');

  const [inputError, setInputError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const bankLists = {
    'Chase Bank': [
      '480',
      '602',
      '623',
      '205',
      '251',
      '256',
      '334',
      '659',
      '938',
      '501',
      '369',
      '303',
      '720',
      '203',
      '475',
      '302',
      '678',
      '470',
      '943',
    ],
    'Wells Fargo': [
      '209',
      '253',
      '509',
      '425',
      '707',
      '564',
      '424',
      '619',
      '408',
      '669',
      '510',
      '415',
      '909',
      '916',
      '406',
      '559',
      '661',
      '541',
      '925',
      '530',
      '831',
      '858',
      '702',
      '725',
      '775',
      '720',
      '970',
      '719',
      '505',
      '575',
      '469',
      '956',
      '409',
      '512',
      '210',
      '817',
      '254',
      '915',
      '430',
      '806',
      '361',
      '830',
      '940',
      '979',
      '325',
      '936',
      '432',
      '612',
      '218',
      '507',
      '952',
      '763',
      '320',
      '651',
      '605',
      '732',
      '908',
      '609',
      '856',
      '201',
      '551',
      '973',
      '862',
      '606',
      '907',
      '250',
      '202',
      '301',
      '703',
    ],
    'Region Bank': [
      '205',
      '251',
      '938',
      '334',
      '423',
      '931',
      '615',
      '731',
      '865',
      '901',
      '456',
      '603',
    ],
    'Citizens Bank': ['413', '978', '351', '617', '781', '339', '401'],
    'Bank Of America': ['336', '910', '252', '828', '919', '984', '704'],
    'MT BANK': [
      '215',
      '267',
      '272',
      '412',
      '484',
      '570',
      '610',
      '724',
      '717',
      '814',
      '240',
      '301',
      '443',
      '667',
      '212',
      '718',
      '917',
      '646',
    ],
    'Huntington Bank': [
      '937',
      '330',
      '740',
      '614',
      '513',
      '440',
      '216',
      '419',
      '567',
      '248',
      '269',
      '616',
      '810',
      '517',
      '313',
      '989',
      '734',
      '231',
      '586',
      '906',
    ],
    'USAA Bank': [
      '719',
      '845',
      '410',
      '469',
      '512',
      '480',
      '623',
      '602',
      '813',
    ],
    'Capital One': ['703', '804', '617', '770', '773', '872', '415'],
    'Truist Bank': [
      '423',
      '984',
      '443',
      '667',
      '606',
      '202',
      '440',
      '216',
      '937',
      '254',
      '281',
      '325',
      '346',
      '361',
      '409',
      '430',
      '432',
      '469',
      '512',
      '305',
      '904',
      '732',
      '856',
      '908',
    ],
    'Union Bank': [
      '559',
      '209',
      '760',
      '530',
      '442',
      '530',
      '831',
      '925',
      '669',
      '408',
      '707',
    ],
    'Key Bank': [
      '845',
      '267',
      '445',
      '215',
      '716',
      '959',
      '860',
      '716',
      '518',
      '315',
    ],
    'Pnc Bank': ['303', '720', '719', '970'],
    'Fulton Bank': ['267', '215', '445', '732', '848'],
    'TD Bank': [
      '508',
      '617',
      '978',
      '781',
      '863',
      '561',
      '321',
      '386',
      '201',
      '609',
      '732',
      '856',
      '908',
      '212',
      '718',
      '917',
      '646',
    ],
    'Santander Bank': [
      '218',
      '320',
      '507',
      '612',
      '651',
      '763',
      '952',
      '353',
      '217',
      '224',
      '309',
      '312',
      '331',
      '618',
      '630',
      '708',
      '773',
      '779',
      '815',
      '847',
      '614',
      '380',
      '518',
    ],
    'US Bank': [
      '215',
      '267',
      '272',
      '412',
      '484',
      '570',
      '610',
      '717',
      '724',
      '814',
      '212',
      '917',
      '201',
      '609',
      '732',
      '856',
      '908',
      '508',
      '617',
      '978',
      '781',
    ],
    'HSBC Bank': [
      '341',
      '407',
      '201',
      '609',
      '732',
      '856',
      '908',
      '212',
      '646',
      '206',
    ],
    'Royal Bank': ['315', '607', '608', '301', '520', '503', '661', '608'],
    'Amex Bank': [
      '404',
      '470',
      '678',
      '770',
      '630',
      '646',
      '623',
      '480',
      '602',
      '801',
      '754',
      '416',
      '647',
    ],
    'NavyFed Bank': [
      '850',
      '448',
      '856',
      '505',
      '575',
      '410',
      '305',
      '786',
      '540',
      '845',
      '804',
      '310',
      '803',
      '839',
      '915',
      '760',
      '703',
      '571',
    ],
    'BNY Mellon': [
      '212',
      '424',
      '650',
      '949',
      '415',
      '617',
      '203',
      '860',
      '302',
      '800',
      '202',
      '877',
      '954',
      '321',
      '305',
    ],
    'FirstFed Bank': ['971', '503'],
    'Alliant Union': ['314', '636', '816', '660', '573', '417'],
    AMFCU: [
      '385',
      '435',
      '801',
      '208',
      '971',
      '505',
      '575',
      '602',
      '520',
      '480',
      '623',
      '702',
      '725',
      '775',
    ],
    SFFCU: [
      '909',
      '760',
      '213',
      '310',
      '424',
      '661',
      '818',
      '310',
      '424',
      '714',
      '949',
    ],
    BPFCU: ['516', '718', '917', '646', '631'],
    BFCU: ['720', '303', '983', '307', '970'],
    CCU: ['763', '715', '534', '608', '779'],
    KFCU: ['228', '251', '601', '505'],
    'MIDFLORIDA CU': [
      '407',
      '689',
      '321',
      '626',
      '863',
      '727',
      '352',
      '809',
      '769',
    ],
    BINANCE: [
      '212',
      '718',
      '808',
      '210',
      '214',
      '254',
      '281',
      '325',
      '346',
      '361',
      '409',
      '430',
      '432',
      '469',
      '512',
      '682',
      '713',
      '737',
      '806',
      '802',
    ],
    COINBASE: [
      '209',
      '530',
      '661',
      '201',
      '732',
      '908',
      '609',
      '202',
      '301',
      '703',
    ],
    KRAKEN: ['703', '917', '646'],
    BLOCKCHAIN: [
      '270',
      '502',
      '606',
      '859',
      '757',
      '571',
      '703',
      '540',
      '804',
      '208',
      '202',
      '301',
      '703',
    ],
  };

  const [openBank, setOpenBank] = useState(null);

  const toggleBank = (bankName) => {
    setOpenBank(openBank === bankName ? null : bankName);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (areaCode === '') {
      setInputError('Area Code required.');
      return;
    }

    if (!/^\d{3}$/.test(areaCode)) {
      setInputError('Area Code must be exactly 3 digits.');
      return;
    }

    if (size === '') {
      setInputError('Size required.');
      return;
    }

    if (!/^\d{3}$/.test(areaCode)) {
      setInputError('keep the figure in the 100s');
      return;
    }

    // Clear any previous error
    setInputError('');

    // Create FormData object
    const formData = new FormData();
    formData.append('user_id', userID);
    formData.append('project_id', projectID);
    formData.append('area_code', areaCode);
    formData.append('size', size);

    // Make a POST request to the server
    const url = baseUrl + 'api/phone-generator/generate-numbers/';
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
      console.log('Numbers Generated successfully');
      navigate('/all-numbers'); // Navigate to success page
    } catch (error) {
      console.error('Error generating numbers:', error.message);
      // Check if the error comes from server validation
      if (error.message === 'Errors' && data && data.errors) {
        setInputError(Object.values(data.errors).flat().join('\n'));
      } else {
        setInputError('Failed to generate numbers.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="mx-auto max-w-270">
        <Breadcrumb pageName="Generate Numbers" />

        {console.log(userID)}

        <div className="grid grid-cols-5 gap-8">
          <div className="col-span-5 xl:col-span-3">
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="border-b border-stroke py-4 px-7 dark:border-strokedark">
                <h3 className="font-medium text-black dark:text-white">
                  Generate Numbers
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
                    <div className="grid grid-cols-2 gap-5">
                      <div className="col-span-1">
                        <label
                          className="mb-3 block text-sm font-medium text-black dark:text-white"
                          htmlFor="areaCode"
                        >
                          Area Code
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
                            id="areaCode"
                            name="areaCode"
                            type="number"
                            maxLength={3}
                            value={areaCode}
                            onChange={(e) => setAreaCode(e.target.value)}
                            placeholder="Area Code"
                          />
                        </div>
                      </div>
                      <div className="col-span-1">
                        <label
                          className="mb-3 block text-sm font-medium text-black dark:text-white"
                          htmlFor="areaCode"
                        >
                          Size
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
                            id="size"
                            name="size"
                            type="number"
                            maxLength={3}
                            value={size}
                            onChange={(e) => setSize(e.target.value)}
                            placeholder="ex. 50"
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
                        Generate
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="col-span-5 xl:col-span-2">
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="border-b border-stroke py-4 px-7 dark:border-strokedark">


                <h3 className='text-xl font-semibold'>Banks and thier Area Codes</h3>
                <div className="w-full max-w-3xl mx-auto p-4">
                  {Object.entries(bankLists).map(([bankName, numbers]) => (
                    <div
                      key={bankName}
                      className="mb-2 border rounded-md overflow-hidden"
                    >
                      <button
                        className={`w-full text-left p-3 bg-gray-100 hover:bg-gray-200 focus:outline-none ${
                          openBank === bankName
                            ? 'border-b border-gray-300'
                            : ''
                        }`}
                        onClick={() => toggleBank(bankName)}
                      >
                        {bankName}
                      </button>
                      {openBank === bankName && (
                        <div className="p-3">
                          {numbers.map((number, index) => (
                            <span
                              key={index}
                              className="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2"
                            >
                              {number}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default GenerateNumbers;
