const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Przechowywanie danych w pamięci (tymczasowe - póżniej użyjemy Vercel KV lub innej bazy)
let data = {
  products: [],
  releases: [],
  history: []
};

// GET - pobierz wszystkie dane
app.get('/api/data', (req, res) => {
  res.json(data);
});

// POST - zapisz wszystkie dane
app.post('/api/data', (req, res) => {
  data = req.body;
  res.json({ success: true, message: 'Dane zapisane' });
});

// POST - dodaj produkt
app.post('/api/products', (req, res) => {
  const product = req.body;
  product.id = Date.now().toString();
  product.createdAt = new Date().toISOString();
  data.products.push(product);
  
  data.history.unshift({
    type: 'Dodano produkt',
    product: product.name,
    details: `Początkowa ilość: ${product.quantity}`,
    date: new Date().toISOString()
  });
  
  res.json({ success: true, product });
});

// PUT - aktualizuj produkt
app.put('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const index = data.products.findIndex(p => p.id === id);
  
  if (index !== -1) {
    const oldQuantity = data.products[index].quantity;
    data.products[index] = { ...data.products[index], ...req.body };
    
    data.history.unshift({
      type: 'Zmiana stanu',
      product: data.products[index].name,
      details: `Ze ${oldQuantity} na ${data.products[index].quantity}`,
      date: new Date().toISOString()
    });
    
    res.json({ success: true, product: data.products[index] });
  } else {
    res.status(404).json({ success: false, message: 'Produkt nie znaleziony' });
  }
});

// DELETE - usuń produkt
app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const index = data.products.findIndex(p => p.id === id);
  
  if (index !== -1) {
    const product = data.products[index];
    data.history.unshift({
      type: 'Usunięto produkt',
      product: product.name,
      details: `Pozostała ilość: ${product.quantity}`,
      date: new Date().toISOString()
    });
    
    data.products.splice(index, 1);
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, message: 'Produkt nie znaleziony' });
  }
});

// POST - dodaj wydanie
app.post('/api/releases', (req, res) => {
  const release = req.body;
  const product = data.products.find(p => p.id === release.productId);
  
  if (!product) {
    return res.status(404).json({ success: false, message: 'Produkt nie znaleziony' });
  }
  
  if (product.quantity < release.quantity) {
    return res.status(400).json({ success: false, message: 'Niewystarczająca ilość produktu' });
  }
  
  product.quantity -= release.quantity;
  release.id = Date.now().toString();
  release.date = new Date().toISOString();
  release.productName = product.name;
  
  data.releases.push(release);
  
  data.history.unshift({
    type: 'Wydanie',
    product: product.name,
    details: `Ilość: ${release.quantity}, Osoba: ${release.person}`,
    date: new Date().toISOString()
  });
  
  res.json({ success: true, release });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
