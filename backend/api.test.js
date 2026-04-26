const request = require('supertest');
const app = require('./server');
const { v4: uuidv4 } = require('uuid');

describe('Expense API endpoints', () => {
  const testIdempotencyKey = uuidv4();
  
  it('should create a new expense and return float amounts', async () => {
    const res = await request(app)
      .post('/expenses')
      .set('Idempotency-Key', testIdempotencyKey)
      .send({
        amount: 25.50,
        category: 'Test Category',
        description: 'Test Description',
        date: '2026-04-26'
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('id');
    // Proves our integer math converted it back correctly for the frontend
    expect(res.body.amount).toEqual(25.50); 
    expect(res.body.category).toEqual('Test Category');
  });

  it('should block duplicate submissions using the idempotency key', async () => {
    const res = await request(app)
      .post('/expenses')
      .set('Idempotency-Key', testIdempotencyKey) // Using the same key as above!
      .send({
        amount: 25.50,
        category: 'Test Category',
        description: 'Trying to create a duplicate!',
        date: '2026-04-26'
      });

    // Should return 200 (OK) instead of 201 (Created) because it caught the duplicate
    expect(res.statusCode).toEqual(200); 
    // Description should be the original one, proving it didn't overwrite or duplicate
    expect(res.body.description).toEqual('Test Description'); 
  });

  it('should reject requests missing required fields', async () => {
    const res = await request(app)
      .post('/expenses')
      .send({
        description: 'Missing amount and date'
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toBeDefined();
  });
});