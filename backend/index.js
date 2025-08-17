const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3001;

// React build を配信
app.use(express.static(path.join(__dirname, '../frontend/build')));

app.get('/check', (req, res) => {
  res.json({ result: "当選です！🎉" });
});

// SPA ルーティング対応
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});