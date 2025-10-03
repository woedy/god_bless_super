import React from 'react';

const Pagination = ({ pagination, setPage }) => {
  const { page_number, total_pages, next, previous } = pagination;

  const handlePageChange = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= total_pages) {
      setPage(pageNumber);
    }
  };

  // Helper function to create a range of page numbers to display
  const getPageNumbers = () => {
    const maxPagesToShow = 5; // Number of pages to show around the current page
    const startPage = Math.max(1, page_number - Math.floor(maxPagesToShow / 2)); // Starting page number
    const endPage = Math.min(total_pages, page_number + Math.floor(maxPagesToShow / 2)); // Ending page number

    // Create an array of pages to display
    let pageNumbers = [];
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    // If there are too many pages before or after, show ellipses
    if (startPage > 1) {
      pageNumbers = [1, '...', ...pageNumbers];
    }
    if (endPage < total_pages) {
      pageNumbers = [...pageNumbers, '...', total_pages];
    }

    return pageNumbers;
  };

  return (
    <div className="flex justify-center mb-5">
      <nav aria-label="Page navigation example">
        <ul className="flex items-center -space-x-px h-8 text-sm bg-gray rounded-lg">
          {/* Previous button */}
          <li
            onClick={() => handlePageChange(previous)}
            className={`cursor-pointer ${!previous ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <a
              href="#"
              className="flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-stroke border-e-0 border-gray-300 rounded-s-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
            >
              <span className="sr-only">Previous</span>
              <svg
                className="w-2.5 h-2.5 rtl:rotate-180"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 6 10"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 1 1 5l4 4"
                />
              </svg>
            </a>
          </li>

          {/* Page number links */}
          {getPageNumbers().map((page, index) => {
            if (page === '...') {
              return (
                <li key={index} className="text-gray-500">...</li> // Display ellipsis
              );
            } else {
              return (
                <li key={page} onClick={() => handlePageChange(page)}>
                  <a
                    href="#"
                    className={`flex items-center justify-center px-3 h-8 leading-tight ${page === page_number ? 'text-blue-600 border-blue-300 bg-blue-50 hover:bg-blue-100 hover:text-blue-700' : 'text-gray-500 bg-white border-gray-300 hover:bg-gray-100 hover:text-gray-700'} dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white`}
                    aria-current={page === page_number ? 'page' : undefined}
                  >
                    {page}
                  </a>
                </li>
              );
            }
          })}

          {/* Next button */}
          <li
            onClick={() => handlePageChange(next)}
            className={`cursor-pointer ${!next ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <a
              href="#"
              className="flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-stroke border-gray-300 rounded-e-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
            >
              <span className="sr-only">Next</span>
              <svg
                className="w-2.5 h-2.5 rtl:rotate-180"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 6 10"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="m1 9 4-4-4-4"
                />
              </svg>
            </a>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Pagination;
