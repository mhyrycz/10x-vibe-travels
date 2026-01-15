Jako doświadczony inżynier QA, po dogłębnej analizie dostarczonych plików projektu VibeTravels, przedstawiam kompleksowy plan testów, mający na celu zapewnienie najwyższej jakości, stabilności i bezpieczeństwa aplikacji.

---

# Kompleksowy Plan Testów dla Projektu VibeTravels

## 1. Wprowadzenie i cele testowania

### 1.1. Wprowadzenie

Niniejszy dokument określa strategię, zakres, podejście i zasoby przeznaczone na proces testowania aplikacji VibeTravels. VibeTravels to aplikacja internetowa w wersji MVP, która wykorzystuje sztuczną inteligencję do generowania spersonalizowanych planów podróży. Plan ten ma na celu zapewnienie, że finalny produkt będzie spełniał wymagania funkcjonalne, będzie niezawodny, bezpieczny i intuicyjny dla użytkownika.

### 1.2. Główne cele testowania

- **Weryfikacja funkcjonalności:** Zapewnienie, że wszystkie kluczowe funkcje, takie jak rejestracja, tworzenie planów, integracja z AI i zarządzanie kontem, działają zgodnie z dokumentacją wymagań (PRD).
- **Zapewnienie stabilności i niezawodności:** Identyfikacja i eliminacja błędów, które mogłyby prowadzić do awarii aplikacji, utraty danych lub niespójności stanu.
- **Weryfikacja bezpieczeństwa:** Sprawdzenie, czy mechanizmy uwierzytelniania i autoryzacji skutecznie chronią dane użytkowników przed nieautoryzowanym dostępem.
- **Ocena użyteczności i doświadczenia użytkownika (UX):** Zapewnienie, że interfejs jest intuicyjny, responsywny i przyjazny dla użytkownika na różnych urządzeniach.
- **Walidacja integracji:** Potwierdzenie poprawnej komunikacji między frontendem, backendem (Astro API), bazą danych (Supabase) i zewnętrznymi usługami (OpenRouter.ai).

## 2. Zakres testów

### 2.1. Funkcjonalności w zakresie testów (In-Scope)

- **Zarządzanie Uwierzytelnianiem i Kontem:**
  - Rejestracja, logowanie, wylogowywanie.
  - Zmiana hasła, usuwanie konta.
  - Ochrona tras i przekierowania dla niezalogowanych użytkowników.
- **Onboarding i Zarządzanie Preferencjami:**
  - Wymuszony proces ustawiania preferencji po pierwszym logowaniu.
  - Edycja i zapisywanie preferencji w profilu użytkownika.
- **Zarządzanie Planami Podróży:**
  - Tworzenie nowego planu z wykorzystaniem AI (w trybie rzeczywistym i mockowanym).
  - Walidacja formularza tworzenia planu (limity dat, długości tekstu itp.).
  - Wyświetlanie listy planów i obsługa stanu pustego.
  - Wyświetlanie szczegółów planu, w tym wygenerowanych dni i aktywności.
  - Edycja metadanych planu (nazwa, budżet).
  - Regeneracja planu na podstawie zmienionych parametrów.
  - Usuwanie planu.
- **Zarządzanie Aktywnościami:**
  - Edycja szczegółów aktywności.
  - Przenoszenie aktywności między dniami (drag-and-drop).
  - Walidacja i obsługa ostrzeżeń o "przeładowanych" dniach.
- **Warstwa API:**
  - Wszystkie punkty końcowe w `src/pages/api/`.
  - Walidacja danych wejściowych (Zod), autoryzacja i obsługa błędów.
- **Logowanie Zdarzeń:**
  - Weryfikacja, czy kluczowe akcje użytkownika są poprawnie zapisywane w bazie danych.

### 2.2. Funkcjonalności poza zakresem testów (Out-of-Scope)

- Testowanie samego modelu AI (OpenRouter.ai) pod kątem jakości generowanych treści (zakładamy, że działa zgodnie z kontraktem).
- Testowanie infrastruktury Supabase i DigitalOcean (zakładamy ich niezawodność).
- Formalne testy wydajnościowe i obciążeniowe wykraczające poza podstawową weryfikację czasu odpowiedzi.
- Testowanie narzędzi deweloperskich (ESLint, Prettier, Husky).

## 3. Typy testów do przeprowadzenia

W celu zapewnienia kompleksowego pokrycia, zostaną przeprowadzone następujące typy testów:

- **Testy jednostkowe (Unit Tests):**
  - **Cel:** Weryfikacja małych, izolowanych fragmentów kodu, takich jak funkcje pomocnicze, walidacje Zod i proste komponenty React.
  - **Narzędzia:** Vitest, React Testing Library.
  - **Przykłady:**
    - Testowanie schematów walidacji Zod dla formularzy.
    - Testowanie funkcji transformujących dane (np. `transformPlanToViewModel`).
    - Testowanie logiki w customowych hookach React z zamockowanym `QueryClient`.
- **Testy komponentów (Component Tests):**
  - **Cel:** Weryfikacja interaktywnych komponentów React w izolacji.
  - **Narzędzia:** React Testing Library, Vitest.
  - **Przykłady:**
    - Testowanie walidacji formularza logowania i wyświetlania błędów.
    - Testowanie interakcji z modalem edycji aktywności.
    - Weryfikacja, czy komponent `PlanGrid` poprawnie renderuje listę planów.
- **Testy integracyjne (Integration Tests):**
  - **Cel:** Weryfikacja współpracy między różnymi częściami systemu, zwłaszcza między warstwą API/serwisową a bazą danych.
  - **Narzędzia:** Vitest (lub inne narzędzie do testów backendu w Node.js), testowa baza danych Supabase.
  - **Przykłady:**
    - Testowanie serwisu `plans.service.ts` - wywołanie funkcji `createPlan` i weryfikacja, czy odpowiednie rekordy zostały utworzone w testowej bazie danych.
    - Testowanie funkcji `move_activity_transaction` poprzez wywołanie odpowiedniego API i sprawdzenie spójności `order_index` w bazie.
    - Testowanie polityk RLS – próba dostępu do danych innego użytkownika i oczekiwanie na błąd.
- **Testy End-to-End (E2E):**
  - **Cel:** Symulacja rzeczywistych scenariuszy użytkownika w przeglądarce, weryfikująca cały przepływ danych od interfejsu po bazę danych.
  - **Narzędzia:** Playwright
  - **Przykłady:**
    - Pełny scenariusz: rejestracja, onboarding, stworzenie planu, edycja aktywności, wylogowanie.
    - Testowanie ochrony tras – próba wejścia na stronę `/` bez logowania.
    - Weryfikacja optymistycznych aktualizacji UI i ich spójności po odświeżeniu danych.
- **Testy dymne (Smoke Tests):**
  - **Cel:** Szybkie sprawdzenie, czy najważniejsze funkcjonalności działają po każdej nowej implementacji. Będą częścią pipeline'u CI.
  - **Narzędzia:** Playwright
  - **Przykłady:**
    - Czy strona główna się ładuje?
    - Czy można się zalogować i wylogować?
    - Czy widać listę planów?
- **Testy regresji wizualnej (Opcjonalnie):**
  - **Cel:** Wykrywanie niezamierzonych zmian w wyglądzie UI.
  - **Narzędzia:** Storybook + Chromatic.
  - **Przykłady:** Porównywanie zrzutów ekranu komponentów UI (np. `Button`, `Card`) między kolejnymi commitami.

## 4. Scenariusze testowe dla kluczowych funkcjonalności

Poniżej przedstawiono przykładowe, wysokopoziomowe scenariusze testowe. Każdy z nich zostanie rozwinięty w szczegółowe przypadki testowe.

### 4.1. Przepływ tworzenia planu (Happy Path)

1.  **Warunki wstępne:** Użytkownik jest zalogowany i ukończył onboarding.
2.  **Kroki:**
    1.  Przejdź na stronę główną (`/`).
    2.  Kliknij przycisk "Utwórz plan".
    3.  Wypełnij formularz poprawnymi danymi (destynacja, daty w przyszłości, notatka, preferencje).
    4.  Kliknij "Generuj Plan".
    5.  Obserwuj ekran ładowania.
    6.  Po zakończeniu, zweryfikuj, że nastąpiło przekierowanie na stronę szczegółów nowego planu.
    7.  Sprawdź, czy plan zawiera dni zgodne z wybranym zakresem dat i czy każdy dzień ma aktywności.
3.  **Oczekiwany rezultat:** Plan został pomyślnie utworzony i jest zgodny z wprowadzonymi danymi. W bazie danych zostało zarejestrowane zdarzenie `plan_generated`.

### 4.2. Obsługa limitu planów

1.  **Warunki wstępne:** Użytkownik jest zalogowany i posiada już 10 planów.
2.  **Kroki:**
    1.  Przejdź na stronę główną. Sprawdź, czy przycisk "Utwórz plan" jest nieaktywny.
    2.  Przejdź bezpośrednio na stronę `/plans/new`.
    3.  Wypełnij formularz.
    4.  Kliknij "Generuj Plan".
3.  **Oczekiwany rezultat:** Aplikacja wyświetla komunikat o błędzie informujący o osiągnięciu limitu 10 planów. Nowy plan nie zostaje utworzony.

### 4.3. Przenoszenie aktywności między dniami (Drag-and-Drop)

1.  **Warunki wstępne:** Użytkownik jest na stronie szczegółów planu, który ma co najmniej dwa dni z aktywnościami.
2.  **Kroki:**
    1.  Chwyć aktywność z "Dnia 1".
    2.  Przeciągnij ją i upuść na obszar "Dnia 2".
    3.  Obserwuj optymistyczną aktualizację UI (aktywność znika z Dnia 1 i pojawia się w Dniu 2).
    4.  Odśwież stronę.
3.  **Oczekiwany rezultat:** Po odświeżeniu zmiana jest trwała. Aktywność znajduje się w Dniu 2, a kolejność (`order_index`) aktywności w obu dniach jest spójna i bez luk.

### 4.4. Autoryzacja dostępu do planu

1.  **Warunki wstępne:** Istnieją dwaj użytkownicy: Użytkownik A i Użytkownik B. Użytkownik A posiada plan o znanym ID.
2.  **Kroki:**
    1.  Zaloguj się jako Użytkownik B.
    2.  Spróbuj uzyskać bezpośredni dostęp do planu Użytkownika A poprzez URL (`/plans/{planId_Uzytkownika_A}`).
    3.  Spróbuj wykonać operację API na planie Użytkownika A (np. `PATCH /api/plans/{planId_Uzytkownika_A}`).
3.  **Oczekiwany rezultat:** Aplikacja zwraca błąd 404 lub 403, uniemożliwiając dostęp. Użytkownik B nie widzi danych Użytkownika A.

## 5. Środowisko testowe

- **Lokalne środowisko deweloperskie:** Używane do testów jednostkowych, komponentowych i integracyjnych. Wymaga uruchomienia lokalnej instancji Supabase.
- **Środowisko Staging:** Kopia środowiska produkcyjnego, hostowana na DigitalOcean. Używane do testów E2E, UAT (User Acceptance Testing) i weryfikacji poprawności deploymentu. Połączone z oddzielną bazą danych Supabase (staging).
- **Przeglądarki:** Testy będą przeprowadzane na najnowszych wersjach Chrome, Firefox i Safari.
- **Urządzenia:** Testy responsywności będą wykonywane na symulatorach urządzeń mobilnych (np. iPhone 13, Samsung Galaxy S21) oraz na rzeczywistych urządzeniach.

## 6. Narzędzia do testowania

- **Framework do testów jednostkowych/komponentowych:** [Vitest](https://vitest.dev/)
- **Biblioteka do testowania komponentów React:** [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- **Framework do testów E2E:** [Playwright](https://playwright.dev/)
- **Mockowanie API:** [Mock Service Worker (MSW)](https://mswjs.io/) do testów komponentów i E2E.
- **CI/CD:** [GitHub Actions](https://github.com/features/actions) do automatyzacji uruchamiania testów.

## 7. Harmonogram testów

Testowanie będzie prowadzone równolegle z procesem deweloperskim, zgodnie z metodyką "ciągłego testowania".

- **Sprint 1 (Tydzień 1):** Skupienie na testach jednostkowych i integracyjnych dla logiki uwierzytelniania, onboardingu i serwisu `userPreferences`. Ustawienie szkieletu testów E2E.
- **Sprint 2 (Tydzień 2):** Testy integracyjne i E2E dla kluczowej funkcjonalności tworzenia i wyświetlania planów. Testowanie serwisu AI (w trybie mock).
- **Sprint 3 (Tydzień 3):** Testy komponentowe i E2E dla edycji, usuwania i regeneracji planów. Intensywne testowanie logiki przenoszenia aktywności.
- **Sprint 4 (Tydzień 4):** Faza stabilizacji. Testy regresji, testy na różnych przeglądarkach. Testy dymne na środowisku stagingowym.

## 8. Kryteria akceptacji testów

### 8.1. Kryteria wejścia ( rozpoczęcia testów)

- Funkcjonalność została zaimplementowana i jest dostępna w gałęzi deweloperskiej.
- Kod pomyślnie przeszedł weryfikację lintera i buduje się bez błędów.
- Dostępna jest dokumentacja techniczna lub opis funkcjonalności.

### 8.2. Kryteria wyjścia (zakończenia testów)

- **Pokrycie kodu testami:**
  - Testy jednostkowe i integracyjne dla warstwy serwisowej: > 80%.
  - Testy komponentów dla kluczowych interaktywnych elementów: > 70%.
- **Wyniki testów:**
  - 100% testów jednostkowych i integracyjnych w pipeline CI musi zakończyć się sukcesem.
  - 100% krytycznych scenariuszy E2E musi zakończyć się sukcesem.
- **Błędy:**
  - Brak otwartych błędów o priorytecie krytycznym (Blocker) lub wysokim (High).
  - Wszystkie zidentyfikowane błędy zostały zaraportowane i odpowiednio spriorytetyzowane.
- **Dostępność:** Strona główna i kluczowe formularze osiągają wynik > 90 w audycie Lighthouse Accessibility.

## 9. Role i odpowiedzialności w procesie testowania

- **Deweloper:**
  - Odpowiedzialny za pisanie testów jednostkowych i komponentowych dla tworzonych przez siebie funkcjonalności.
  - Uruchamianie testów lokalnie przed wypchnięciem zmian.
  - Naprawianie błędów zidentyfikowanych w procesie testowania.
- **Inżynier QA (autor tego planu):**
  - Projektowanie i utrzymywanie strategii testowej.
  - Tworzenie i utrzymywanie testów integracyjnych i E2E.
  - Zarządzanie procesem raportowania błędów i weryfikacja poprawek.
  - Monitorowanie wyników testów w pipeline CI/CD.

## 10. Procedury raportowania błędów

Wszystkie zidentyfikowane błędy będą raportowane jako "Issues" w repozytorium GitHub projektu.

### 10.1. Szablon zgłoszenia błędu

Każde zgłoszenie powinno zawierać:

- **Tytuł:** Zwięzły opis problemu.
- **Opis:**
  - **Kroki do odtworzenia:** Szczegółowa, numerowana lista kroków.
  - **Oczekiwany rezultat:** Co powinno się wydarzyć.
  - **Rzeczywisty rezultat:** Co się wydarzyło.
- **Środowisko:** Wersja przeglądarki, system operacyjny, urządzenie.
- **Dowody:** Zrzuty ekranu, nagrania wideo, logi z konsoli.
- **Priorytet:**
  - **Krytyczny (Blocker):** Błąd blokujący kluczowe funkcjonalności, uniemożliwiający dalsze testy.
  - **Wysoki (High):** Poważny błąd funkcjonalny, który znacząco wpływa na użyteczność.
  - **Średni (Medium):** Błąd funkcjonalny o mniejszym wpływie lub błąd UI.
  - **Niski (Low):** Drobny problem kosmetyczny, literówka.

### 10.2. Cykl życia błędu

1.  **Nowy (New):** Błąd został zgłoszony.
2.  **Potwierdzony (Acknowledged):** Błąd został przeanalizowany i potwierdzony.
3.  **W trakcie (In Progress):** Deweloper pracuje nad poprawką.
4.  **Do weryfikacji (Ready for QA):** Poprawka jest gotowa do testów na środowisku stagingowym.
5.  **Zamknięty (Closed):** Poprawka została zweryfikowana i błąd nie występuje.
6.  **Otwarty ponownie (Reopened):** Poprawka okazała się nieskuteczna.

---
