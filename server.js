const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Example root route
app.get('/', (req, res) => {
  res.send('Hit Report ELO API is running!');
});

// Placeholder for ELO API endpoints
// app.get('/api/elo', ...)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
