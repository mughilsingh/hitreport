const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve static files (HTML, CSS, JS, images) from the root directory
app.use(express.static(path.join(__dirname)));

// Serve index.html for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});


// Basic ELO calculation function
function calculateElo(ratingA, ratingB, result, K = 22) {
  // result: 1 = A wins, 0 = B wins, 0.5 = draw
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const expectedB = 1 / (1 + Math.pow(10, (ratingA - ratingB) / 400));
  const newA = ratingA + K * (result - expectedA);
  const newB = ratingB + K * ((1 - result) - expectedB);
  return { newA: Math.round(newA), newB: Math.round(newB) };
}

// POST /api/elo
// Body: { ratingA, ratingB, result }
app.post('/api/elo', (req, res) => {
  const { ratingA, ratingB, result } = req.body;
  if (
    typeof ratingA !== 'number' ||
    typeof ratingB !== 'number' ||
    typeof result !== 'number'
  ) {
    return res.status(400).json({ error: 'Invalid input' });
  }
  const { newA, newB } = calculateElo(ratingA, ratingB, result);
  res.json({ newA, newB });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
