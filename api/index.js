const express = require('express');
const cors = require('cors');

const app = express();

// Sprawdź czy Vercel KV jest dostępny
let kv;
let useInMemoryFallback = false;

try {
  kv = require('@vercel/kv').kv;
  // Sprawdź czy zmienne środowiskowe są ustawione
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    console.warn('⚠️  Vercel KV zmienne środowiskowe nie są ustawione. Używam pamięci RAM (dane zostaną utracone po restarcie).');
    useInMemoryFallback = true;
  }
} catch (error) {
  console.warn('⚠️  Vercel KV niedostępny. Używam pamięci RAM (dane zostaną utracone po restarcie).');
  useInMemoryFallback = true;
}

// Fallback do in-memory storage dla development
const inMemoryStorage = {
  products: [],
  releases: [],
  history: []
};

// Konfiguracja CORS - whitelist dozwolonych domen
const allowedOrigins = [
  'http://localhost:3000',           // Development - lokalne API
  'http://localhost:5173',           // Development - Vite
  'http://localhost:8080',           // Development - inne narzędzia
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];

// Automatycznie dodaj domenę Vercel
if (process.env.VERCEL_URL) {
  // VERCEL_URL nie zawiera protokołu, dodajemy https://
  allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
  console.log(`📍 Dodano domenę Vercel do CORS: https://${process.env.VERCEL_URL}`);
}

// Dodaj domenę z zmiennej środowiskowej (dla custom domain)
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
  console.log(`📍 Dodano custom domenę do CORS: ${process.env.FRONTEND_URL}`);
}

const corsOptions = {
  origin: function (origin, callback) {
    // Pozwól na requesty bez origin (np. same-origin na Vercel, Postman, curl)
    if (!origin) {
      return callback(null, true);
    }

    // Sprawdź czy origin jest na whitelist
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }

    // Jeśli to Vercel deployment preview (zawiera vercel.app)
    if (origin.includes('.vercel.app')) {
      console.log(`✅ Dozwolono Vercel preview: ${origin}`);
      return callback(null, true);
    }

    // Zablokuj nieznane origins
    console.warn(`❌ CORS blocked request from origin: ${origin}`);
    console.warn(`   Dozwolone origins: ${allowedOrigins.join(', ')}`);
    callback(new Error('Dostęp zablokowany przez CORS. Origin nie jest dozwolony.'));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Klucze dla Vercel KV
const KV_KEYS = {
  PRODUCTS: 'magazyn:products',
  RELEASES: 'magazyn:releases',
  HISTORY: 'magazyn:history'
};

// Funkcje pomocnicze dla Vercel KV z fallback do in-memory
async function getProducts() {
  if (useInMemoryFallback) {
    return inMemoryStorage.products;
  }

  try {
    const products = await kv.get(KV_KEYS.PRODUCTS);
    return products || [];
  } catch (error) {
    console.error('Błąd pobierania produktów z KV:', error);
    return [];
  }
}

async function setProducts(products) {
  if (useInMemoryFallback) {
    inMemoryStorage.products = products;
    return true;
  }

  try {
    await kv.set(KV_KEYS.PRODUCTS, products);
    return true;
  } catch (error) {
    console.error('Błąd zapisywania produktów do KV:', error);
    return false;
  }
}

async function getReleases() {
  if (useInMemoryFallback) {
    return inMemoryStorage.releases;
  }

  try {
    const releases = await kv.get(KV_KEYS.RELEASES);
    return releases || [];
  } catch (error) {
    console.error('Błąd pobierania wydań z KV:', error);
    return [];
  }
}

async function setReleases(releases) {
  if (useInMemoryFallback) {
    inMemoryStorage.releases = releases;
    return true;
  }

  try {
    await kv.set(KV_KEYS.RELEASES, releases);
    return true;
  } catch (error) {
    console.error('Błąd zapisywania wydań do KV:', error);
    return false;
  }
}

async function getHistory() {
  if (useInMemoryFallback) {
    return inMemoryStorage.history;
  }

  try {
    const history = await kv.get(KV_KEYS.HISTORY);
    return history || [];
  } catch (error) {
    console.error('Błąd pobierania historii z KV:', error);
    return [];
  }
}

async function setHistory(history) {
  if (useInMemoryFallback) {
    inMemoryStorage.history = history;
    return true;
  }

  try {
    await kv.set(KV_KEYS.HISTORY, history);
    return true;
  } catch (error) {
    console.error('Błąd zapisywania historii do KV:', error);
    return false;
  }
}

async function addToHistory(entry) {
  try {
    const history = await getHistory();
    history.unshift(entry);
    // Ogranicz historię do ostatnich 1000 wpisów
    if (history.length > 1000) {
      history.splice(1000);
    }
    await setHistory(history);
    return true;
  } catch (error) {
    console.error('Błąd dodawania do historii:', error);
    return false;
  }
}

// Funkcje walidacyjne - ochrona przed złymi danymi
function sanitizeString(str, maxLength = 500) {
  if (!str) return '';
  return String(str).trim().substring(0, maxLength);
}

function validateProduct(product) {
  const errors = [];

  // Walidacja nazwy
  if (!product.name || typeof product.name !== 'string' || product.name.trim().length === 0) {
    errors.push('Nazwa produktu jest wymagana');
  } else if (product.name.length > 200) {
    errors.push('Nazwa produktu nie może być dłuższa niż 200 znaków');
  }

  // Walidacja kategorii
  const validCategories = ['Iniekcje', 'Pompa 1k', 'Pompa 2k', 'Materiały budowlane', 'Sprzęt'];
  if (!product.category || !validCategories.includes(product.category)) {
    errors.push('Kategoria jest wymagana i musi być jedną z: ' + validCategories.join(', '));
  }

  // Walidacja ilości
  if (typeof product.quantity !== 'number' || product.quantity < 0 || !Number.isInteger(product.quantity)) {
    errors.push('Ilość musi być liczbą całkowitą większą lub równą 0');
  }

  // Walidacja opisu (opcjonalne)
  if (product.description && product.description.length > 1000) {
    errors.push('Opis nie może być dłuższy niż 1000 znaków');
  }

  // Walidacja lokacji (opcjonalne)
  if (product.location && product.location.length > 200) {
    errors.push('Lokalizacja nie może być dłuższa niż 200 znaków');
  }

  // Walidacja obrazu (opcjonalne) - sprawdź czy to base64 lub URL
  if (product.image) {
    if (typeof product.image !== 'string') {
      errors.push('Obraz musi być stringiem (base64 lub URL)');
    } else if (product.image.length > 10 * 1024 * 1024) { // 10MB
      errors.push('Obraz jest zbyt duży (max 10MB)');
    }
  }

  return errors;
}

function validateRelease(release) {
  const errors = [];

  // Walidacja productId
  if (!release.productId || typeof release.productId !== 'string') {
    errors.push('ID produktu jest wymagane');
  }

  // Walidacja ilości
  if (typeof release.quantity !== 'number' || release.quantity <= 0 || !Number.isInteger(release.quantity)) {
    errors.push('Ilość musi być liczbą całkowitą większą od 0');
  }

  // Walidacja osoby
  if (!release.person || typeof release.person !== 'string' || release.person.trim().length === 0) {
    errors.push('Osoba odbierająca jest wymagana');
  } else if (release.person.length > 200) {
    errors.push('Nazwa osoby nie może być dłuższa niż 200 znaków');
  }

  return errors;
}

// GET - pobierz wszystkie dane
app.get('/api/data', async (req, res) => {
  try {
    const [products, releases, history] = await Promise.all([
      getProducts(),
      getReleases(),
      getHistory()
    ]);

    res.json({
      products,
      releases,
      history
    });
  } catch (error) {
    console.error('Błąd pobierania danych:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas pobierania danych'
    });
  }
});

// POST /api/data został usunięty ze względów bezpieczeństwa
// Niebezpieczne całkowite nadpisanie danych bez walidacji
// Użyj dedykowanych endpointów: POST /api/products, PUT /api/products/:id, etc.

// POST - dodaj produkt
app.post('/api/products', async (req, res) => {
  try {
    // Walidacja danych wejściowych
    const errors = validateProduct(req.body);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Błąd walidacji danych',
        errors
      });
    }

    // Sanityzacja danych
    const product = {
      id: Date.now().toString(),
      name: sanitizeString(req.body.name, 200),
      category: req.body.category,
      description: sanitizeString(req.body.description, 1000),
      location: sanitizeString(req.body.location, 200),
      quantity: parseInt(req.body.quantity),
      image: req.body.image ? sanitizeString(req.body.image, 10 * 1024 * 1024) : null,
      createdAt: new Date().toISOString()
    };

    // Pobierz produkty i dodaj nowy
    const products = await getProducts();
    products.push(product);
    await setProducts(products);

    // Dodaj do historii
    await addToHistory({
      type: 'Dodano produkt',
      product: sanitizeString(product.name, 200),
      details: `Początkowa ilość: ${product.quantity}`,
      date: new Date().toISOString()
    });

    res.json({ success: true, product });
  } catch (error) {
    console.error('Błąd dodawania produktu:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas dodawania produktu'
    });
  }
});

// PUT - aktualizuj produkt
app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Walidacja ID
    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Nieprawidłowe ID produktu'
      });
    }

    const products = await getProducts();
    const index = products.findIndex(p => p.id === id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'Produkt nie znaleziony'
      });
    }

    const oldQuantity = products[index].quantity;

    // Walidacja i sanityzacja tylko przekazanych pól
    const updates = {};

    if (req.body.quantity !== undefined) {
      if (typeof req.body.quantity !== 'number' || req.body.quantity < 0 || !Number.isInteger(req.body.quantity)) {
        return res.status(400).json({
          success: false,
          message: 'Ilość musi być liczbą całkowitą większą lub równą 0'
        });
      }
      updates.quantity = parseInt(req.body.quantity);
    }

    if (req.body.name !== undefined) {
      if (!req.body.name || typeof req.body.name !== 'string' || req.body.name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Nazwa produktu nie może być pusta'
        });
      }
      updates.name = sanitizeString(req.body.name, 200);
    }

    if (req.body.description !== undefined) {
      updates.description = sanitizeString(req.body.description, 1000);
    }

    if (req.body.location !== undefined) {
      updates.location = sanitizeString(req.body.location, 200);
    }

    // Aktualizuj produkt
    products[index] = { ...products[index], ...updates };
    await setProducts(products);

    // Dodaj do historii tylko jeśli ilość się zmieniła
    if (updates.quantity !== undefined && updates.quantity !== oldQuantity) {
      await addToHistory({
        type: 'Zmiana stanu',
        product: sanitizeString(products[index].name, 200),
        details: `Ze ${oldQuantity} na ${products[index].quantity}`,
        date: new Date().toISOString()
      });
    }

    res.json({ success: true, product: products[index] });
  } catch (error) {
    console.error('Błąd aktualizacji produktu:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas aktualizacji produktu'
    });
  }
});

// DELETE - usuń produkt
app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Walidacja ID
    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Nieprawidłowe ID produktu'
      });
    }

    const products = await getProducts();
    const index = products.findIndex(p => p.id === id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'Produkt nie znaleziony'
      });
    }

    const product = products[index];

    await addToHistory({
      type: 'Usunięto produkt',
      product: sanitizeString(product.name, 200),
      details: `Pozostała ilość: ${product.quantity}`,
      date: new Date().toISOString()
    });

    products.splice(index, 1);
    await setProducts(products);

    res.json({ success: true, message: 'Produkt został usunięty' });
  } catch (error) {
    console.error('Błąd usuwania produktu:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas usuwania produktu'
    });
  }
});

// POST - dodaj wydanie
app.post('/api/releases', async (req, res) => {
  try {
    // Walidacja danych wejściowych
    const errors = validateRelease(req.body);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Błąd walidacji danych',
        errors
      });
    }

    const products = await getProducts();
    const product = products.find(p => p.id === req.body.productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produkt nie znaleziony'
      });
    }

    const requestedQuantity = parseInt(req.body.quantity);

    if (product.quantity < requestedQuantity) {
      return res.status(400).json({
        success: false,
        message: `Niewystarczająca ilość produktu. Dostępne: ${product.quantity}, Żądane: ${requestedQuantity}`
      });
    }

    // Sanityzacja danych
    const release = {
      id: Date.now().toString(),
      productId: sanitizeString(req.body.productId, 50),
      productName: sanitizeString(product.name, 200),
      quantity: requestedQuantity,
      person: sanitizeString(req.body.person, 200),
      date: new Date().toISOString()
    };

    // Zmniejsz ilość produktu
    product.quantity -= requestedQuantity;
    await setProducts(products);

    // Dodaj wydanie
    const releases = await getReleases();
    releases.push(release);
    await setReleases(releases);

    // Dodaj do historii
    await addToHistory({
      type: 'Wydanie',
      product: sanitizeString(product.name, 200),
      details: `Ilość: ${release.quantity}, Osoba: ${sanitizeString(release.person, 200)}`,
      date: new Date().toISOString()
    });

    res.json({ success: true, release });
  } catch (error) {
    console.error('Błąd dodawania wydania:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas dodawania wydania'
    });
  }
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const [products, releases] = await Promise.all([
      getProducts(),
      getReleases()
    ]);

    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      products: products.length,
      releases: releases.length
    });
  } catch (error) {
    console.error('Błąd health check:', error);
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

// Middleware obsługi nieznanych endpointów (404)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint nie znaleziony',
    path: req.path
  });
});

// Globalny middleware obsługi błędów
app.use((error, req, res, next) => {
  console.error('Nieobsłużony błąd:', error);
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Wewnętrzny błąd serwera',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('=================================');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);

  if (useInMemoryFallback) {
    console.log('⚠️  Storage: IN-MEMORY (dane zostaną utracone po restarcie)');
    console.log('💡 Aby użyć Vercel KV, ustaw zmienne środowiskowe:');
    console.log('   KV_REST_API_URL, KV_REST_API_TOKEN');
  } else {
    console.log('✅ Storage: VERCEL KV (trwałe dane)');
  }

  console.log('=================================');
});

module.exports = app;
