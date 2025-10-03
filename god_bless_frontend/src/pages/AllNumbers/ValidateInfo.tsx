import { useCallback, useEffect, useState } from 'react';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import userThree from '../../images/user/user-03.png';
import { baseUrl, projectID, truncateText, userID, userToken } from '../../constants';
import { Link, useNavigate } from 'react-router-dom';
import Pagination from '../../components/Pagination';

const ValidateInfo = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [date, setElectionYear] = useState('');
  const [itemCount, setItemCount] = useState(0);
  const [numbers, setNumbers] = useState([]);
  const [totalPages, setTotalPages] = useState(1); // Default to 1 to avoid issues
  const [loading, setLoading] = useState(false);

  // State for delete confirmation modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${baseUrl}api/phone-generator/get-valid-numbers/?search=${encodeURIComponent(
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
  }, [baseUrl, search, page, date, userToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <>
      <div className="mx-auto max-w-full">
        <Breadcrumb pageName="Validate Info" />

        <p className='pb-5'>{itemCount} numbers</p>

        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-6 xl:col-span-8">
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
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
                <div className="col-span-1 flex items-center">
                  <p className="font-medium">Actions</p>
                </div>
              </div>

              {numbers
                ? numbers.map((number) => (
                    <div
                      className="grid grid-cols-8 border-t border-stroke py-4.5 px-4 dark:border-strokedark sm:grid-cols-8 md:px-6 2xl:px-7.5 hover:bg-graydark"
                      key={number?.id || 'default-key'}
                    >
                      {/* Columns with data */}
                      <div className="col-span-1 flex items-center">
                        <p className="text-sm text-black dark:text-white">
                          {number?.prefix ? number.prefix : '-'}
                        </p>
                      </div>
                      <div className="col-span-1 flex items-center">
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
                              : 'bg-red-600 text-white'
                          } dark:text-white`}
                        >
                          {number?.valid_number ? 'Valid' : 'Invalid'}
                        </p>
                      </div>
                      <div className="col-span-1 flex items-center">
                        <p className="text-sm text-black dark:text-white">
                          {number?.carrier
                            ? truncateText(number.carrier, 50)
                            : '-'}
                        </p>
                      </div>
                      <div className="col-span-1 flex items-center">
                        <p className="text-sm text-black dark:text-white">
                          {number?.location
                            ? truncateText(number.location, 50)
                            : '-'}
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
                      <div className="col-span-1 hidden items-center sm:flex">
                        {/* Actions (buttons) */}
                        <div className="flex items-center space-x-3.5">
                          {/* Action buttons */}
                          <button className="hover:text-primary">
                            <Link to={'/number-details/' + number.id}>
                              <svg width="18" height="18" fill="none">
                                {/* SVG for view details */}
                              </svg>
                            </Link>
                          </button>
                          <button className="hover:text-primary">
                            <svg width="18" height="18" fill="none">
                              {/* SVG for another action */}
                            </svg>
                          </button>
                          <button className="hover:text-primary">
                            <svg width="18" height="18" fill="none">
                              {/* SVG for delete action */}
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                : null}

              {/* Pagination */}
              <Pagination
                pagination={{
                  page_number: page,
                  total_pages: totalPages,
                  next: page < totalPages ? page + 1 : null,
                  previous: page > 1 ? page - 1 : null,
                }}
                setPage={setPage}
              />
            </div>
          </div>

          {/* Fixed "Tools" Section */}
          <div className="col-span-6 xl:col-span-4 fixed top-0 right-0 mt-40 mr-8 w-1/4">
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="border-b border-stroke py-4 px-7 dark:border-strokedark">
                <h3 className="font-bold text-2xl text-black dark:text-white">
                  Tools
                </h3>
                <h3 className="text-sm text-black dark:text-white mb-5">
                  Caution!! Always Use a VPN for researches.
                </h3>

                <div className="mb-4">
                  <h3 className="font-bold text-black dark:text-white mb-1">
                    Info Finders
                  </h3>
                  <a href="https://www.fastpeoplesearch.com/" target="_blank">
                    <p>https://www.fastpeoplesearch.com/</p>
                  </a>
                  <a href="https://www.usphonebook.com/" target="_blank">
                    <p>https://www.usphonebook.com/</p>
                  </a>
                  <a href="https://castrickclues.com/" target="_blank">
                    <p>https://castrickclues.com/</p>
                  </a>
                  <a href="https://rocketreach.co/" target="_blank">
                    <p>https://rocketreach.co/</p>
                  </a>
                  <a href="https://epieos.com/" target="_blank">
                    <p className="mb-4">https://epieos.com/</p>
                  </a>

                  <span className="text-xs text-green">Search Whatsapp</span>
                  <a href="https://osint.rocks/" target="_blank">
                    <p className="">https://osint.rocks/</p>
                  </a>
                </div>

                <div className="mb-4">
                  <h3 className="font-bold text-black dark:text-white mb-1">
                    Social Finders
                  </h3>
                  <a href="https://instantusername.com/" target="_blank">
                    <p>https://instantusername.com/</p>
                  </a>
                  <span className="text-xs text-green">Best on mobile</span>

                  <a href="https://whatsmyname.app/" target="_blank">
                    <p>https://whatsmyname.app/</p>
                  </a>
                </div>

                <div className="mb-4">
                  <h3 className="font-bold text-black dark:text-white mb-1">
                    Telegram Bot Finders
                  </h3>
                  <a href="https://t.me/UniversalSearchEasyBot" target="_blank">
                    <p>https://t.me/UniversalSearchEasyBot</p>
                  </a>

                  <a href="https://t.me/anotherLeakOSINTbot" target="_blank">
                    <p>https://t.me/anotherLeakOSINTbot</p>
                  </a>
                </div>

                <div className="mb-4">
                  <h3 className="font-bold text-black dark:text-white mb-1">
                    Face Finders
                  </h3>

                  <a href="https://avatarapi.com/" target="_blank">
                    <p>https://avatarapi.com/</p>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ValidateInfo;
