Frontend - Astro z React dla komponentów interaktywnych:

- Astro 5 pozwala na tworzenie szybkich, wydajnych stron i aplikacji z minimalną ilością JavaScript
- React 19 zapewni interaktywność tam, gdzie jest potrzebna
- TypeScript 5 dla statycznego typowania kodu i lepszego wsparcia IDE
- Tailwind 4 pozwala na wygodne stylowanie aplikacji
- Shadcn/ui zapewnia bibliotekę dostępnych komponentów React, na których oprzemy UI

Backend - Supabase jako kompleksowe rozwiązanie backendowe:

- Zapewnia bazę danych PostgreSQL
- Zapewnia SDK w wielu językach, które posłużą jako Backend-as-a-Service
- Jest rozwiązaniem open source, które można hostować lokalnie lub na własnym serwerze
- Posiada wbudowaną autentykację użytkowników

AI - Komunikacja z modelami przez usługę Openrouter.ai:

- Dostęp do szerokiej gamy modeli (OpenAI, Anthropic, Google i wiele innych), które pozwolą nam znaleźć rozwiązanie zapewniające wysoką efektywność i niskie koszta
- Pozwala na ustawianie limitów finansowych na klucze API
- Implementacja:
  - Type-safe wrapper w `/src/lib/services/openrouter/` z pełnym TypeScript typowaniem
  - Strukturowane outputy (Structured Outputs) używające Zod schematów i JSON Schema
  - Automatyczna walidacja odpowiedzi AI z Zod
  - Retry logic z exponential backoff dla obsługi błędów tymczasowych
  - Custom error classes dla różnych scenariuszy błędów (auth, rate limit, timeout, validation)
  - Hardcoded model: `gpt-4o-mini-2024-07-18` (optymalizacja kosztów)
  - Mock mode dla development (USE_MOCK_AI=true) aby unikać kosztów API podczas developmentu
  - Request/response logging w trybie development
  - Timeout management (60s default, configurowalny)
  - Connection testing endpoint do weryfikacji konfiguracji API

Testing:

- Unit & Component Tests:
  - Vitest jako framework do testów jednostkowych i komponentowych
  - React Testing Library do testowania komponentów React w izolacji
  - Mock Service Worker (MSW) do mockowania API w testach
  - Zod schemas wykorzystywane do walidacji danych w testach
- E2E Tests:
  - Playwright jako framework do testów end-to-end
  - Testowanie na najnowszych wersjach Chrome
  - Symulatory urządzeń mobilnych oraz testy na rzeczywistych urządzeniach

CI/CD i Hosting:

- Github Actions do tworzenia pipeline'ów CI/CD
- DigitalOcean do hostowania aplikacji za pośrednictwem obrazu docker
