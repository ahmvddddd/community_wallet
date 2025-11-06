require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { errorHandler } = require('./middlewares/error/errorMiddleware');
const apiRoutes = require('./routes/indexRoutes');
const initServer = require('./db/initServer'); 

const app = express();


app.use(helmet());
app.use(cors());
app.use(express.json());


app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});


app.use('/api/v1', apiRoutes);


app.use(errorHandler);


(async () => {
  await initServer();

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
})();
