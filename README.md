# 📦 System Magazynowy BTB

Aplikacja magazynowa z synchronizacją w czasie rzeczywistym.

## 🚀 Wdrożenie na Vercel

### Krok 1: Przygotowanie
1. Pobierz cały folder `magazyn-btb` na swój komputer
2. Załóż konto na https://vercel.com (możesz zalogować się przez GitHub)

### Krok 2: Wgranie aplikacji
1. Zaloguj się na Vercel
2. Kliknij "Add New..." → "Project"
3. Wybierz "Upload folder" i przeciągnij folder `magazyn-btb`
4. Kliknij "Deploy"

### Krok 3: Dodaj Vercel KV (baza danych) - WYMAGANE!
**WAŻNE:** Aplikacja wymaga Vercel KV do przechowywania danych!

1. W Vercel Dashboard, przejdź do zakładki **Storage**
2. Kliknij **Create Database**
3. Wybierz **KV** (Redis)
4. Podaj nazwę np. `magazyn-btb-kv`
5. Wybierz region (najlepiej najbliższy Twojej lokalizacji)
6. Kliknij **Create**

Vercel automatycznie doda zmienne środowiskowe do Twojego projektu!

### Krok 4: Konfiguracja zmiennych środowiskowych
Po dodaniu KV, dodaj jeszcze zmienne środowiskowe:

1. Przejdź do Settings → Environment Variables
2. Dodaj następujące zmienne:
   - `NODE_ENV` = `production`
   - `FRONTEND_URL` = `https://twoja-domena.vercel.app` (URL Twojej aplikacji)

### Krok 5: Redeploy projektu
Po dodaniu Vercel KV, musisz zrobić redeploy:

1. Przejdź do zakładki **Deployments**
2. Kliknij na najnowszy deployment
3. Kliknij **...** (trzy kropki) → **Redeploy**

### Krok 6: Gotowe!
Po około 2 minutach Twoja aplikacja będzie gotowa pod adresem:
`https://magazyn-btb.vercel.app`

**WAŻNE:** Po wdrożeniu, zaktualizuj zmienną `FRONTEND_URL` swoim faktycznym URL!

## ✅ Trwałość danych - Vercel KV

**Aplikacja wykorzystuje Vercel KV (Redis) do przechowywania danych.**

Dane są w pełni trwałe i nie znikną po restarcie serwera!

### Koszty Vercel KV:
- **Hobby plan**: Do 256 MB danych - **DARMOWY** ✅
- **Pro plan**: Do 512 MB danych - 1$/miesiąc
- Dla magazynu BTB, darmowy plan powinien w zupełności wystarczyć

### Co jest przechowywane w KV:
- ✅ Produkty z pełnymi danymi (nazwa, kategoria, ilość, zdjęcie, lokalizacja)
- ✅ Historia wydań (kto, kiedy, ile)
- ✅ Log operacji (dodanie, usunięcie, zmiana)

## 📱 Jak używać

1. Otwórz aplikację na tablecie w magazynie
2. Otwórz tę samą aplikację na swoim telefonie/komputerze
3. Wszystkie zmiany synchronizują się automatycznie co 5 sekund
4. Działa na wielu urządzeniach jednocześnie

## 🔧 Funkcje

- ✅ Dodawanie produktów ze zdjęciami
- ✅ Rejestrowanie wydań z magazynu
- ✅ Historia wszystkich operacji
- ✅ Automatyczna synchronizacja
- ✅ Działa na telefonach, tabletach, komputerach
- ✅ Zabezpieczenia: walidacja danych, ochrona przed XSS, ograniczony CORS

## 🔒 Bezpieczeństwo

Aplikacja została zabezpieczona przed:
- ✅ **XSS (Cross-Site Scripting)** - escapowanie HTML we frontendzie
- ✅ **Injection attacks** - walidacja i sanityzacja wszystkich danych wejściowych
- ✅ **Nieautoryzowany dostęp** - CORS ograniczony do zaufanych domen
- ✅ **Przepełnienie bufora** - limity długości stringów i rozmiarów plików
- ✅ **Błędy serwera** - globalna obsługa błędów

### Konfiguracja CORS dla własnej domeny

Po wdrożeniu na Vercel, zaktualizuj plik `api/index.js` linia 13:
```javascript
// Dodaj swoją domenę do whitelist
allowedOrigins.push('https://twoja-domena.vercel.app');
```

## 💻 Uruchomienie lokalne (dla deweloperów)

### Wymagania
- Node.js 18.x lub wyższy
- npm lub yarn

### Instalacja
```bash
# Zainstaluj zależności
npm install

# Uruchom serwer deweloperski
npm run dev
```

Aplikacja będzie dostępna pod adresem:
- Frontend: otwórz `public/index.html` w przeglądarce
- Backend API: http://localhost:3000/api

### Zmienne środowiskowe
Skopiuj `.env.example` jako `.env` i dostosuj wartości:
```bash
cp .env.example .env
```

## 📞 Potrzebujesz pomocy?

Jeśli masz problemy z wdrożeniem, napisz do mnie!
