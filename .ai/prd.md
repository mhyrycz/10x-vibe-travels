# Dokument wymagań produktu (PRD) - VibeTravels

## 1. Przegląd produktu

VibeTravels to webowa aplikacja (MVP) w języku polskim, która pomaga w planowaniu angażujących podróży poprzez przekształcanie prostych notatek użytkownika w szczegółowe plany wycieczek z wykorzystaniem AI. Produkt jest przeznaczony dla indywidualnych podróżników, par oraz rodzin, które samodzielnie organizują wyjazdy i chcą szybko uzyskać dopasowany do ich preferencji harmonogram podróży.

Aplikacja umożliwia:
- tworzenie konta użytkownika z profilem preferencji podróżniczych,
- zapis, podgląd, edycję i usuwanie planów podróży,
- wprowadzenie jednej notatki opisującej pomysł na wyjazd,
- podanie podstawowych parametrów (daty, destynacja, preferencje, transport),
- wygenerowanie szczegółowego planu dziennego z blokami czasowymi przy użyciu AI.

MVP ma być zrealizowane w ciągu 4 tygodni przez jednego programistę i pełni funkcję projektu edukacyjnego, z naciskiem na prostą, działającą wersję produktu.

Cele biznesowo‑produktowe:
- Uproszczenie procesu planowania podróży.
- Uzyskanie podstawowych danych o zachowaniu użytkowników (liczba planów, wypełnienie profilu).
<!-- - Sprawdzenie atrakcyjności pomysłu i jakości doświadczenia użytkownika. -->

## 2. Problem użytkownika

Planowanie ciekawych i dobrze zorganizowanych wycieczek jest czasochłonne i wymaga:
- szukania inspiracji i atrakcji,
- dopasowania planu do długości wyjazdu,
- uwzględnienia liczby osób, budżetu, stylu podróży i preferowanego środka transportu,
- rozpisania harmonogramu dni na konkretne aktywności.

Użytkownicy (solo, pary, rodziny):
- często zaczynają od luźnych notatek (linki, pomysły, nazwy miejsc),
- nie mają czasu lub umiejętności, aby przekształcić to w gotowy, szczegółowy plan,
- chcą otrzymać szybko „gotowiec”: plan na konkretne dni, z rozbiciem na bloki czasowe i uwzględnieniem ich stylu podróżowania.

VibeTravels rozwiązuje ten problem, pozwalając użytkownikowi:
- wprowadzić jedną prostą notatkę + parametry podróży,
- jednym kliknięciem wygenerować harmonogram wyjazdu, który:
  - jest dopasowany do liczby dni i dat,
  - uwzględnia preferencje podróżnicze,
  - prezentuje atrakcje z przybliżonym czasem i blokami dnia.

## 3. Wymagania funkcjonalne

3.1. Konta użytkowników i profil

3.1.1. Rejestracja i logowanie
- Użytkownik może:
  - zarejestrować konto poprzez e‑mail i hasło,
  - zalogować się na swoje konto przy użyciu zarejestrowanych danych.
- Po założeniu konta użytkownik przechodzi przez onboarding preferencji.

3.1.2. Preferencje podróżnicze (profil)
- Przy pierwszym logowaniu użytkownik wypełnia obowiązkowe preferencje:
  - liczba osób,
  - typ podróży: prywatny / służbowy,
  - wiek,
  - kraj pochodzenia,
  - komfort zwiedzania: relaks / optymalny / intensywne zwiedzanie,
  - budżet: tanio / optymalnie / luksus.
- Preferencje są przechowywane w profilu i zawsze wstępnie wczytywane do formularza tworzenia nowego planu.
- Użytkownik może w dowolnym momencie:
  - edytować swoje preferencje na ekranie profilu,
  - zapisać zaktualizowane wartości.
- Preferencje z profilu mogą być nadpisane dla konkretnego planu (np. inny styl podróży dla wyjazdu służbowego).

3.1.3. Ustawienia konta
- Użytkownik może:
  - zmienić hasło (podając obecne hasło oraz nowe, z podstawową walidacją),
  - usunąć swoje konto (co powoduje usunięcie powiązanych planów zgodnie z polityką aplikacji).

3.2. Tworzenie planów podróży (AI „na jedno kliknięcie”)

3.2.1. Formularz tworzenia nowego planu
Formularz zawiera:
- pole tekstowe „Notatka o podróży”
  - jedno duże pole tekstowe w języku polskim,
  - użytkownik może wprowadzić luźny opis, listę pomysłów, linki do artykułów, nazw atrakcji itp.
- pole „Destynacja”
  - pojedyncze pole tekstowe, w którym użytkownik wpisuje nazwę miasta lub kraju,
  - obsługa swobodnego tekstu (bez walidacji na konkretną listę).
- pole „Zakres dat podróży”
  - data startu,
  - data końca,
  - walidacje:
    - data startu i data końca nie mogą być w przeszłości względem dnia tworzenia,
    - różnica między datą końca a datą startu nie może przekraczać 30 dni.
- sekcja „Preferencje podróży dla tego planu”
  - pola domyślnie wypełnione wartościami z profilu użytkownika:
    - liczba osób,
    - typ podróży,
    - komfort zwiedzania,
    - budżet,
  - użytkownik może zmienić wartości na potrzeby danego planu.
- sekcja „Preferowany transport w tej podróży”
  - wybór jednej z opcji:
    - samochód,
    - pieszo,
    - transport publiczny.
  - opcja piesza jest ignorowana między dużymi odległościami (np. między miastami/krajami)

3.2.2. Generowanie planu
- Po wypełnieniu formularza użytkownik klika przycisk „Generuj plan”.
- Aplikacja:
  - przekazuje notatkę, daty, destynację i parametry do warstwy AI,
  - otrzymuje z AI propozycję planu.
- Generowany plan:
  - obejmuje wszystkie dni od daty startu do daty końca (maks. 30 dni),
  - dla każdego dnia zawiera 3 bloki:
    - poranek,
    - popołudnie,
    - wieczór,
  - w każdym bloku umieszczone są atrakcje, dla każdej atrakcji:
    - nazwa,
    - przybliżony czas trwania,
  - plan uwzględnia także:
    - orientacyjny czas transportu między atrakcjami lub blokami, zgodnie z wybraną opcją transportu,
    - dopasowanie intensywności do komfortu zwiedzania (np. mniej atrakcji przy trybie „relaks”, więcej przy „intensywne zwiedzanie”).

3.2.3. Nazwa planu
- Po wygenerowaniu planu aplikacja automatycznie nadaje nazwę, na przykład:
  - „[Destynacja], [data_start] – [data_koniec]”.
- Użytkownik może ręcznie zmienić nazwę planu w widoku szczegółowym.

3.3. Przeglądanie i zarządzanie planami

3.3.1. Lista planów
- Użytkownik ma dostęp do ekranu „Moje plany”, gdzie widzi listę wszystkich swoich planów.
- Dane wyświetlane na liście:
  - nazwa podróży,
  - destynacja,
  - data utworzenia planu.
- Lista jest sortowana wg jednej reguły (np. malejąco po dacie utworzenia – najnowsze na górze).
- Limit:
  - jeden użytkownik może posiadać maksymalnie 10 zapisanych planów.
  - jeśli użytkownik próbuje stworzyć nowy plan, mając już 10:
    - aplikacja wyświetla komunikat informujący, że należy najpierw usunąć istniejący plan.

3.3.2. Szczegóły planu
- Po kliknięciu planu na liście użytkownik przechodzi do widoku szczegółowego.
- Widok szczegółowy zawiera:
  - nazwę planu (z możliwością edycji),
  - destynację,
  - zakres dat,
  - wybrany tryb transportu,
  - parametry podróży użyte dla planu (liczba osób, typ, komfort, budżet),
  - plan dzienny:
    - każdy dzień wyświetlony w osobnej sekcji,
    - w ramach dnia trzy bloki: poranek, popołudnie, wieczór,
    - w każdym bloku lista atrakcji:
      - nazwa,
      - przybliżony czas trwania,
      - opcjonalnie informacja o czasie transportu,
  - dostęp (bez konieczności eksponowania UI) do pierwotnej notatki, powiązanej z planem, do celów ponownego generowania.

3.3.3. Edycja planu
- Użytkownik może w widoku szczegółowym:
  - edytować nazwę planu,
  - zmienić budżet przypisany do planu,
  - edytować przybliżony czas trwania atrakcji,
  - przenosić atrakcje między blokami dnia (np. z poranka do popołudnia) za pomocą prostego mechanizmu (np. wybór bloku z listy),
  - skorygować parametry podróży (np. liczba osób, transport),
  - edytować notatkę wejściową, na podstawie której generowany jest plan.
- Po zmianach użytkownik może:
  - zapisać zmiany ręcznie w istniejącym planie,
  - uruchomić ponowne generowanie planu na podstawie zaktualizowanej notatki i parametrów:
    - nowy plan zastępuje poprzednią wersję (brak wersjonowania w MVP).

3.3.4. Ostrzeżenia o „przeładowaniu” planu
- Po wygenerowaniu planu:
  - system może obliczyć sumaryczny czas atrakcji oraz transportu dla danego bloku/dnia.
  - jeśli czas przekracza określony próg (np. znacznie więcej niż typowy dzień wycieczkowy), system wyświetla informację ostrzegawczą (np. „Ten dzień może być zbyt intensywny”).
- Przy edycji:
  - jeśli użytkownik doda/zmieni czasy atrakcji w sposób, który powoduje „przeładowanie”, system przy próbie zapisu pokazuje ostrzeżenie.
- Ostrzeżenia mają charakter informacyjny:
  - nie blokują zapisu planu,
  - nie powodują automatycznych korekt planu.

3.3.5. Usuwanie planów
- Użytkownik może usunąć plan z:
  - widoku listy,
  - widoku szczegółowego.
- Przed usunięciem planu aplikacja wyświetla modal z potwierdzeniem, np.:
  - „Na pewno chcesz usunąć ten plan? Operacja jest nieodwracalna.”
- Po potwierdzeniu:
  - plan jest trwale usuwany z konta użytkownika.
  - jeśli użytkownik był przy limicie 10 planów, po usunięciu może utworzyć nowy plan.

3.4. Panel admina

- Dla kont z rolą admin dostępny jest prosty panel administracyjny.
- Funkcjonalności panelu admina:
  - wyświetlenie łącznej liczby użytkowników,
  - wyświetlenie łącznej liczby planów,
  - opcjonalnie lista użytkowników lub planów (prosta tabela):
    - bez rozbudowanego filtrowania, sortowania i wykresów,
  - dane prezentowane w ujęciu „od początku działania systemu” (all‑time).

3.5. Analityka i logowanie zdarzeń

- System powinien rejestrować co najmniej następujące zdarzenia:
  - account_created
  - preferences_completed
  - plan_generated
  - plan_regenerated
  - plan_edited
  - plan_deleted
- Każde zdarzenie zawiera:
  - identyfikator użytkownika (user_id),
  - znacznik czasu (timestamp),
  - identyfikator planu (plan_id), kiedy dotyczy planu,
  - inne pola kontekstowe (np. destination_text, transport_mode, trip_length_days).
- Zdarzenia mogą być zapisywane:
  - w bazie danych lub w prostych logach aplikacyjnych,
  - format i struktura powinny być spójne, aby umożliwić późniejszą analizę i raportowanie.

## 4. Granice produktu

4.1. Zakres MVP

Wchodzą w zakres:
- proste konta użytkowników (rejestracja, logowanie, zmiana hasła, usunięcie konta),
- ekran profilu z preferencjami podróżniczymi,
- tworzenie notatek (jedno pole tekstowe) i parametrów podróży,
- integracja z AI pozwalająca wygenerować:
  - plan dzienny,
  - z blokami poranek/popołudnie/wieczór,
  - z atrakcjami (nazwa + przybliżony czas) i orientacyjnym transportem,
- zapisywanie, podgląd, edycja i usuwanie planów,
- prosty limit 10 planów na użytkownika,
- prosty panel admina z podstawowymi metrykami,
- podstawowa analityka zdarzeń,
- responsywny layout działający na urządzeniach mobilnych i desktopie,
- tylko język polski.

4.2. Poza zakresem MVP

Poza zakresem są:
- współdzielenie planów między kontami (np. zapraszanie innych użytkowników),
- zaawansowane planowanie logistyki:
  - integracje z mapami,
  - zakup biletów, rezerwacje hoteli,
  - optymalizacja tras w czasie rzeczywistym,
- bogata obsługa multimediów:
  - zdjęcia, wideo, zaawansowane analizy treści,
- wielojęzyczność interfejsu,
- rozbudowany system ról i uprawnień poza prostą rolą admina,
- zaawansowane raportowanie i dashboardy BI (wykresy, filtry zaawansowane),
- złożone polityki bezpieczeństwa i zgodności (np. formalne RODO‑compliance poza podstawowymi standardami bezpieczeństwa),
- aplikacje natywne (Android/iOS) – MVP jest webowe.

## 5. Historyjki użytkowników

Poniżej zdefiniowano komplet kluczowych historyjek użytkowników z unikalnymi identyfikatorami i kryteriami akceptacji.

### US-001 – Rejestracja użytkownika

ID: US-001  
Tytuł: Rejestracja nowego użytkownika  
Opis:  
Jako nowy użytkownik chcę zarejestrować konto, aby móc tworzyć i zapisywać swoje plany podróży.

Kryteria akceptacji:
- Użytkownik może otworzyć formularz rejestracji.
- Formularz wymaga co najmniej adresu e‑mail i hasła (min. 10 znaków, jedna duża litera i znak specjalny).
- Po poprawnym wypełnieniu formularza i wysłaniu:
  - tworzony jest nowy użytkownik w systemie,
  - użytkownik zostaje zalogowany lub przekierowany do ekranu logowania (zgodnie z decyzją implementacyjną),
  - rejestrowane jest zdarzenie account_created.
- W przypadku błędów walidacji (np. brak hasła, nieprawidłowy e‑mail) użytkownik otrzymuje czytelny komunikat.

### US-002 – Logowanie użytkownika

ID: US-002  
Tytuł: Logowanie do istniejącego konta  
Opis:  
Jako istniejący użytkownik chcę się zalogować, aby mieć dostęp do swoich planów podróży i profilu.

Kryteria akceptacji:
- Użytkownik może otworzyć formularz logowania.
- Formularz wymaga wpisania e‑maila i hasła.
- Po poprawnym podaniu danych użytkownik zostaje zalogowany i przekierowany do głównego widoku aplikacji - lista planów.
- W przypadku nieprawidłowego e‑maila lub hasła wyświetlany jest czytelny komunikat o błędzie.

### US-003 – Onboarding preferencji

ID: US-003  
Tytuł: Wypełnienie preferencji podczas pierwszego logowania  
Opis:  
Jako nowy użytkownik po założeniu konta chcę szybko wypełnić swoje preferencje podróżnicze, aby aplikacja mogła generować lepiej dopasowane plany.

Kryteria akceptacji:
- Po pierwszym zalogowaniu użytkownik jest przekierowywany do ekranu wypełnienia preferencji.
- Formularz zawiera pola:
  - liczba osób,
  - typ podróży,
  - wiek,
  - kraj pochodzenia,
  - komfort zwiedzania,
  - budżet.
- Formularz nie pozwala na pominięcie tych pól (są wymagane).
- Po zapisaniu preferencji:
  - dane są zapisane w profilu użytkownika,
  - rejestrowane jest zdarzenie preferences_completed,
  - użytkownik jest informowany, że preferencje zostały zapisane i może przejść dalej (np. do tworzenia pierwszego planu).

### US-004 – Edycja preferencji w profilu

ID: US-004  
Tytuł: Edycja preferencji podróżniczych  
Opis:  
Jako zalogowany użytkownik chcę móc edytować swoje preferencje podróżnicze, aby aktualizować styl i sposób podróżowania, który ma być brany pod uwagę przy generowaniu nowych planów.

Kryteria akceptacji:
- Użytkownik może przejść do ekranu profilu.
- Ekran profilu pokazuje aktualne preferencje (liczba osób, typ podróży, komfort, budżet, wiek, kraj).
- Użytkownik może zmienić wartości i zapisać zmiany.
- Po zapisaniu:
  - nowe wartości są używane jako domyślne w formularzu nowego planu,
  - użytkownik otrzymuje informację o powodzeniu operacji.

### US-005 – Zmiana hasła

ID: US-005  
Tytuł: Zmiana hasła konta  
Opis:  
Jako zalogowany użytkownik chcę móc zmienić swoje hasło, aby zadbać o bezpieczeństwo konta.

Kryteria akceptacji:
- Użytkownik w profilu ma dostęp do sekcji „Zmiana hasła”.
- Formularz zmiany hasła wymaga:
  - obecnego hasła,
  - nowego hasła (z walidacją - min. 10 znaków, jedna duża litera i znak specjalny).
- Po poprawnym wypełnieniu i zatwierdzeniu:
  - hasło zostaje zmienione,
  - użytkownik otrzymuje informację o powodzeniu operacji.
- W przypadku nieprawidłowego obecnego hasła użytkownik otrzymuje komunikat o błędzie.

### US-006 – Usunięcie konta

ID: US-006  
Tytuł: Usunięcie konta użytkownika  
Opis:  
Jako zalogowany użytkownik chcę móc usunąć swoje konto, aby mieć kontrolę nad swoimi danymi.

Kryteria akceptacji:
- Użytkownik może zainicjować proces usuwania konta z poziomu profilu.
- Przed usunięciem konta wyświetlany jest modal potwierdzający operację.
- Po potwierdzeniu:
  - konto użytkownika zostaje usunięte,
  - powiązane plany zostają usunięte zgodnie z przyjętą logiką,
  - użytkownik zostaje wylogowany.
- Operacja jest nieodwracalna; użytkownik zostaje o tym poinformowany.

### US-007 – Tworzenie nowego planu podróży

ID: US-007  
Tytuł: Stworzenie nowego planu podróży z notatki  
Opis:  
Jako zalogowany użytkownik chcę utworzyć nowy plan podróży na podstawie mojej notatki i parametrów, aby szybko uzyskać szczegółowy harmonogram wyjazdu.

Kryteria akceptacji:
- Użytkownik może przejść do formularza „Nowy plan”.
- Formularz zawiera:
  - pole notatki (tekst),
  - destynację (tekst),
  - zakres dat (start, koniec z walidacjami),
  - preferencje podróży domyślnie pobrane z profilu,
  - wybór transportu (samochód/pieszo/transport publiczny).
- Jeśli użytkownik ma już 10 planów:
  - formularz nie pozwala na zapis nowego planu,
  - wyświetlany jest komunikat o konieczności usunięcia istniejącego planu.
- Po wypełnieniu formularza i kliknięciu „Generuj plan”:
  - system przekazuje dane do AI i po chwili wyświetla wygenerowany plan dzienny z blokami i atrakcjami.
- Zdarzenie plan_generated jest rejestrowane.

### US-008 – Wyświetlenie listy planów

ID: US-008  
Tytuł: Przegląd listy moich planów podróży  
Opis:  
Jako zalogowany użytkownik chcę zobaczyć listę moich planów podróży, aby móc wybrać i edytować którykolwiek z nich.

Kryteria akceptacji:
- Po zalogowaniu użytkownik ma dostęp do ekranu „Moje plany”.
- Lista wyświetla maksymalnie 10 planów (tyle, ile użytkownik posiada).
- Dla każdego planu wyświetlane są:
  - nazwa planu,
  - destynacja,
  - data utworzenia.
- Plany są sortowane wg zdefiniowanej reguły (np. od najnowszych).
- Kliknięcie planu przenosi do widoku szczegółowego tego planu.

### US-009 – Podgląd szczegółowego planu

ID: US-009  
Tytuł: Podgląd szczegółów planu podróży  
Opis:  
Jako zalogowany użytkownik chcę zobaczyć szczegóły mojego planu podróży, aby przejrzeć zaplanowane atrakcje w każdym dniu.

Kryteria akceptacji:
- Po wybraniu planu z listy użytkownik widzi:
  - nazwę planu,
  - destynację,
  - daty podróży,
  - preferencje użyte w planie (liczba osób, typ, komfort, budżet),
  - informację o preferowanym transporcie,
  - plan dzienny z podziałem na poranek, popołudnie, wieczór,
  - w każdym bloku listę atrakcji z:
    - nazwą,
    - przybliżonym czasem trwania,
    - ewentualną informacją o transporcie.
- Widok jest czytelny na ekranach desktopowych i mobilnych.

### US-010 – Edycja detali planu

ID: US-010  
Tytuł: Edycja szczegółów istniejącego planu  
Opis:  
Jako zalogowany użytkownik chcę edytować szczegóły mojego planu (czasy, budżet, blok dnia, nazwa), aby dopasować go do moich potrzeb.

Kryteria akceptacji:
- Na widoku szczegółów planu użytkownik może:
  - zmienić nazwę planu,
  - zmienić budżet przypisany do planu,
  - edytować przybliżone czasy atrakcji,
  - przenieść atrakcję między blokami (poranek/popołudnie/wieczór) za pomocą prostego wyboru,
  - zmienić parametry podróży (np. liczba osób).
- Po wprowadzeniu zmian użytkownik może:
  - zapisać plan.
- Po zapisaniu:
  - zmiany są widoczne w planie i w kolejnych wejściach na plan,
  - rejestrowane jest zdarzenie plan_edited.

### US-011 – Ponowne generowanie planu

ID: US-011  
Tytuł: Ponowne wygenerowanie planu po zmianie notatki lub parametrów  
Opis:  
Jako użytkownik chcę móc ponownie wygenerować plan na podstawie zaktualizowanej notatki i parametrów, aby otrzymać lepiej dopasowaną propozycję.

Kryteria akceptacji:
- W widoku szczegółowego planu użytkownik może:
  - zaktualizować notatkę,
  - zmienić daty podróży (z zachowaniem walidacji do 30 dni),
  - zaktualizować preferencje czy tryb transportu.
- Po kliknięciu „Wygeneruj ponownie”:
  - system wysyła zaktualizowane dane do AI i po chwili wyświetla nową wersję planu,
  - stara wersja planu zostaje zastąpiona,
  - rejestrowane jest zdarzenie plan_regenerated.
- W przypadku błędów walidacji (np. zakres > 30 dni) użytkownik otrzymuje komunikat i plan nie jest regenerowany.

### US-012 – Ostrzeżenia o przeładowanym dniu

ID: US-012  
Tytuł: Otrzymywanie ostrzeżeń o zbyt intensywnym planie  
Opis:  
Jako użytkownik chcę być ostrzegany, gdy plan dnia jest zbyt przeładowany atrakcjami, aby móc świadomie go skorygować.

Kryteria akceptacji:
- Po wygenerowaniu planu system oblicza orientacyjny sumaryczny czas atrakcji i transportu dla każdego dnia/bloku.
- Jeśli sumaryczny czas przekracza określony próg:
  - na ekranie planu pojawia się komunikat ostrzegawczy dla danego dnia/bloku.
- Podczas edycji planu:
  - jeżeli użytkownik zwiększy czasy atrakcji w sposób, który przekracza próg, przy zapisie planu pojawia się ostrzeżenie.
- Użytkownik może mimo ostrzeżeń zapisać plan.

### US-013 – Usuwanie planu

ID: US-013  
Tytuł: Usunięcie istniejącego planu podróży  
Opis:  
Jako zalogowany użytkownik chcę usunąć wybrany plan, aby zwolnić miejsce na nowe plany lub pozbyć się nieaktualnych wyjazdów.

Kryteria akceptacji:
- Użytkownik może kliknąć „Usuń plan”:
  - z listy planów,
  - z widoku szczegółowego.
- Po kliknięciu wyświetla się modal potwierdzenia.
- Po potwierdzeniu:
  - plan jest usunięty z bazy,
  - plan znika z listy,
  - rejestrowane jest zdarzenie plan_deleted.
- Jeżeli użytkownik miał 10 planów, po usunięciu może stworzyć nowy plan.

### US-014 – Podstawowy panel admina

ID: US-014  
Tytuł: Podgląd statystyk w panelu admina  
Opis:  
Jako administrator chcę mieć dostęp do prostego panelu z łącznymi statystykami użytkowników i planów, aby obserwować wykorzystanie aplikacji.

Kryteria akceptacji:
- Administrator (konto z rolą admin) ma dostęp do panelu admina.
- Panel wyświetla:
  - łączną liczbę zarejestrowanych użytkowników,
  - łączną liczbę zapisanych planów.
- Opcjonalnie:
  - prostą listę użytkowników lub planów (np. w tabeli).
- Dane są prezentowane jako wartości „od początku działania systemu”.

### US-015 – Ograniczenie liczby planów

ID: US-015  
Tytuł: Informowanie o limicie 10 planów  
Opis:  
Jako użytkownik chcę wiedzieć, że mam limit liczby planów, aby rozumieć, dlaczego nie mogę stworzyć więcej niż 10.

Kryteria akceptacji:
- Gdy użytkownik posiada mniej niż 10 planów:
  - może tworzyć nowe plany bez dodatkowych komunikatów o limicie.
- Gdy użytkownik ma 10 planów i próbuje utworzyć kolejny:
  - aplikacja blokuje zapis nowego planu,
  - wyświetla się komunikat informujący o limicie oraz o konieczności usunięcia planu, aby utworzyć nowy.

## 6. Metryki sukcesu

6.1. Główne metryki

- Wypełnienie profilu:
  - Cel: 90% użytkowników posiada wypełnione preferencje turystyczne.
  - Definicja:
    - liczba użytkowników z eventem preferences_completed / liczba użytkowników z eventem account_created.
  - Sposób pomiaru:
    - regularna analiza logów zdarzeń lub proste zapytania do bazy.

- Aktywne korzystanie z planów:
  - Cel: 75% użytkowników generuje 3 lub więcej planów podróży w ciągu roku.
  - Definicja:
    - dla każdego user_id liczba unikalnych zdarzeń plan_generated ≥ 3 w ciągu ostatnich 12 miesięcy.
  - Sposób pomiaru:
    - analiza eventów plan_generated.

6.2. Metryki pomocnicze

- Średnia liczba planów na użytkownika:
  - liczba wszystkich planów / liczba wszystkich użytkowników.
- Częstotliwość usuwania planów:
  - liczba zdarzeń plan_deleted / liczba użytkowników lub planów.
- Częstość ponownego generowania:
  - liczba zdarzeń plan_regenerated / liczba planów lub użytkowników.

6.3. Weryfikacja jakości doświadczenia

Choć MVP nie zakłada formalnych badań zewnętrznych, wewnętrzne testy powinny sprawdzić:
- czy użytkownik jest w stanie:
  - założyć konto,
  - wypełnić preferencje,
  - stworzyć plan na podstawie notatki,
  - zrozumieć strukturę wygenerowanego planu,
  - edytować i usunąć plan bez problemów,
- czy komunikaty walidacyjne i ostrzeżenia są zrozumiałe,
- czy responsywność aplikacji jest wystarczająca na telefonach i desktopie.

PRD stanowi bazę do implementacji MVP VibeTravels w ciągu 4 tygodni przez jednego programistę, zapewniając jasne wymagania funkcjonalne, zdefiniowane granice oraz mierzalne cele sukcesu.