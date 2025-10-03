import React from 'react';

const DeleteConfirmationModal = ({ isOpen, onConfirm, onCancel, itemId }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
      <div className="bg-white p-4 rounded-lg shadow-lg">
        <h2 className="text-lg font-semibold mb-4">Confirm Deletion</h2>
        <p>Are you sure you want to delete this item?</p>
        <div className="mt-4 flex justify-end space-x-4">
          <button
            onClick={() => onConfirm(itemId)}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Delete
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
