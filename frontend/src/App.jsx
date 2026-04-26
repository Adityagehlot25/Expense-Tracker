import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import './App.css'; 

const API_BASE = import.meta.env.VITE_BACKEND_URL;

function App() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters & Sorting State
  const [filterCategory, setFilterCategory] = useState('');
  const [sortDate, setSortDate] = useState('date_desc');

  // Form State
  const [formData, setFormData] = useState({
    amount: '',
    category: 'Food',
    description: '',
    date: new Date().toISOString().split('T')[0] 
  });

  const categories = ['Food', 'Transport', 'Utilities', 'Entertainment', 'Other'];

  const fetchExpenses = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL(`${API_BASE}/expenses`);
      if (filterCategory) url.searchParams.append('category', filterCategory);
      if (sortDate) url.searchParams.append('sort', sortDate);

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch expenses');
      
      const data = await response.json();
      setExpenses(data);
    } catch (err) {
      setError('Could not load expenses. Please check your network.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [filterCategory, sortDate]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const idempotencyKey = uuidv4();

    try {
      const response = await fetch(`${API_BASE}/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey 
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to add expense');

      await fetchExpenses();
      setFormData({ ...formData, amount: '', description: '' });
      document.getElementById('amount-input').focus();
    } catch (err) {
      setError('Failed to save expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalAmount = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);

  // --- NEW: Category Breakdown Calculation ---
  const categoryBreakdown = expenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + (Number(exp.amount) || 0);
    return acc;
  }, {});

  // Shared styles for the rounded cards
  const cardStyle = {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    border: '1px solid #eaeaea'
  };

  const inputStyle = {
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #ccc',
    marginBottom: '15px',
    width: '100%',
    boxSizing: 'border-box'
  };

  return (
    <div style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', padding: '40px 20px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#333' }}>
      
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '30px', color: '#111' }}>Expense Tracker</h1>

        {error && <div style={{ color: '#d32f2f', padding: '12px', background: '#ffebee', borderRadius: '8px', marginBottom: '20px', textAlign: 'center' }}>{error}</div>}

        {/* MAIN LAYOUT GRID */}
        <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          
          {/* LEFT COLUMN: FORM */}
          <div style={{ ...cardStyle, flex: '1 1 300px' }}>
            <h3 style={{ marginTop: 0, borderBottom: '2px solid #f0f0f0', paddingBottom: '10px', marginBottom: '20px' }}>Add New Expense</h3>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontWeight: '600', marginBottom: '5px', fontSize: '14px' }}>Amount (₹)</label>
              <input type="number" id="amount-input" name="amount" value={formData.amount} onChange={handleInputChange} step="0.01" min="0.01" placeholder="0" style={inputStyle} required />

              <label style={{ fontWeight: '600', marginBottom: '5px', fontSize: '14px' }}>Category</label>
              <select name="category" value={formData.category} onChange={handleInputChange} style={inputStyle} required>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <label style={{ fontWeight: '600', marginBottom: '5px', fontSize: '14px' }}>Date</label>
              <input type="date" name="date" value={formData.date} onChange={handleInputChange} style={inputStyle} required />

              <label style={{ fontWeight: '600', marginBottom: '5px', fontSize: '14px' }}>Description</label>
              <input type="text" name="description" value={formData.description} onChange={handleInputChange} placeholder="Optional details..." style={inputStyle} />

              <button type="submit" disabled={isSubmitting} style={{ 
                padding: '12px', 
                background: isSubmitting ? '#a0c4ff' : '#007bff', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                marginTop: '10px',
                transition: 'background 0.2s'
              }}>
                {isSubmitting ? 'Saving...' : 'Add Expense'}
              </button>
            </form>
          </div>

          {/* RIGHT COLUMN: LIST & CONTROLS */}
          <div style={{ ...cardStyle, flex: '2 1 500px' }}>
            
            {/* CONTROLS BAR */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#666', marginBottom: '4px' }}>Filter by Category</label>
                  <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}>
                    <option value="">All Categories</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#666', marginBottom: '4px' }}>Sort by Date</label>
                  <select value={sortDate} onChange={(e) => setSortDate(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}>
                    <option value="date_desc">Newest First</option>
                    <option value="date_asc">Oldest First</option>
                  </select>
                </div>
              </div>
              
              <div style={{ background: '#f0fdf4', padding: '10px 20px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <h2 style={{ margin: 0, color: '#166534', fontSize: '20px' }}>Total: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalAmount)}</h2>
              </div>
            </div>

            {/* --- NEW: CATEGORY SUMMARY BARS --- */}
            {Object.keys(categoryBreakdown).length > 0 && (
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                <span style={{ width: '100%', fontSize: '12px', fontWeight: 'bold', color: '#888', textTransform: 'uppercase', marginBottom: '4px' }}>Spending Breakdown</span>
                {Object.entries(categoryBreakdown).map(([cat, amt]) => (
                  <div key={cat} style={{ background: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', border: '1px solid #dee2e6', display: 'flex', gap: '8px', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                    <span style={{ fontWeight: 'bold', color: '#495057' }}>{cat}</span>
                    <span style={{ color: '#007bff', fontWeight: '600' }}>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amt)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* LIST */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Loading expenses...</div>
            ) : expenses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666', background: '#f9f9f9', borderRadius: '8px' }}>No expenses found for this criteria.</div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {expenses.map((exp) => (
                  <li key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{exp.category}</span>
                        <span style={{ fontSize: '12px', color: '#888', background: '#f0f0f0', padding: '2px 8px', borderRadius: '12px' }}>{exp.date}</span>
                      </div>
                      <div style={{ fontSize: '14px', color: '#555' }}>{exp.description || <span style={{ color: '#aaa', fontStyle: 'italic' }}>No description</span>}</div>
                    </div>
                    <div style={{ fontWeight: 'bold', fontSize: '18px' }}>
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(exp.amount)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;