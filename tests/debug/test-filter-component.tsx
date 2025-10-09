import React, { useState } from 'react';

// Simple test component to verify filter functionality
const TestFilterComponent = () => {
  const [filters, setFilters] = useState({
    valid_number: '',
    carrier: '',
    type: '',
    country_name: '',
    search: ''
  });

  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const testFilters = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        user_id: 'your-user-id', // Replace with actual user ID
        project_id: 'your-project-id', // Replace with actual project ID
        page: '1',
        search: filters.search || '',
      });

      // Add filter parameters
      if (filters.valid_number) {
        params.append('valid_number', filters.valid_number);
      }
      if (filters.type) {
        params.append('type', filters.type);
      }
      if (filters.carrier) {
        params.append('carrier', filters.carrier);
      }
      if (filters.country_name) {
        params.append('country_name', filters.country_name);
      }

      console.log('Testing with params:', params.toString());

      const response = await fetch(
        `http://localhost:8000/api/phone-generator/list-numbers/?${params}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token your-token-here`, // Replace with actual token
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        setResults(result.data.numbers || []);
        console.log('Results:', result.data.numbers?.length || 0, 'numbers found');
      } else {
        console.error('Error:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px' }}>
      <h2>Filter Test Component</h2>
      
      <div style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
        <div>
          <label>Search:</label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
            placeholder="Search phone numbers..."
            style={{ width: '100%', padding: '5px' }}
          />
        </div>

        <div>
          <label>Validation Status:</label>
          <select
            value={filters.valid_number}
            onChange={(e) => setFilters({...filters, valid_number: e.target.value})}
            style={{ width: '100%', padding: '5px' }}
          >
            <option value="">All</option>
            <option value="true">Valid</option>
            <option value="false">Invalid</option>
            <option value="null">Pending</option>
          </select>
        </div>

        <div>
          <label>Type:</label>
          <select
            value={filters.type}
            onChange={(e) => setFilters({...filters, type: e.target.value})}
            style={{ width: '100%', padding: '5px' }}
          >
            <option value="">All</option>
            <option value="Mobile">Mobile</option>
            <option value="Landline">Landline</option>
          </select>
        </div>

        <div>
          <label>Carrier:</label>
          <select
            value={filters.carrier}
            onChange={(e) => setFilters({...filters, carrier: e.target.value})}
            style={{ width: '100%', padding: '5px' }}
          >
            <option value="">All</option>
            <option value="AT&T">AT&T</option>
            <option value="Verizon">Verizon</option>
            <option value="T-Mobile">T-Mobile</option>
            <option value="Sprint">Sprint</option>
          </select>
        </div>

        <div>
          <label>Country:</label>
          <input
            type="text"
            value={filters.country_name}
            onChange={(e) => setFilters({...filters, country_name: e.target.value})}
            placeholder="Filter by country..."
            style={{ width: '100%', padding: '5px' }}
          />
        </div>
      </div>

      <button 
        onClick={testFilters} 
        disabled={loading}
        style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
      >
        {loading ? 'Testing...' : 'Test Filters'}
      </button>

      <div style={{ marginTop: '20px' }}>
        <h3>Results: {results.length} numbers found</h3>
        <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px' }}>
          {results.map((number, index) => (
            <div key={index} style={{ padding: '5px', borderBottom: '1px solid #eee' }}>
              <strong>{number.phone_number}</strong> - 
              Status: {number.valid_number === null ? 'Pending' : number.valid_number ? 'Valid' : 'Invalid'} - 
              Carrier: {number.carrier || 'N/A'} - 
              Type: {number.type || 'N/A'} - 
              Country: {number.country_name || 'N/A'}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        <p>Current filters: {JSON.stringify(filters, null, 2)}</p>
      </div>
    </div>
  );
};

export default TestFilterComponent;