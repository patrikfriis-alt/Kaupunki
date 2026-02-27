# Kaupunki

[backend-README.md](https://github.com/user-attachments/files/25610606/backend-README.md)
# Kaupunki Backend

Proxy-palvelin Kokkolan kaupungin päätösdatan hakemiseen ja uutisten synckaamiseen.

## Teknologiat

- Node.js (no dependencies — pure stdlib)
- Supabase (PostgreSQL)
- Anthropic API (Claude + web search)
- Render.com (hosting)

## Ympäristömuuttujat

Kopioi `.env.example` → `.env` ja täytä arvot:

```bash
cp .env.example .env
```

| Muuttuja | Kuvaus |
|---|---|
| `SUPABASE_URL` | Supabase-projektin URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |
| `ANTHROPIC_API_KEY` | Anthropic API-avain |
| `PORT` | Portti (oletus: 10000) |
| `ALLOWED_ORIGINS` | CORS-sallitut originit, pilkulla erotettu (oletus: *) |
| `DEBUG` | Aseta `true` debug-lokitukseen |

## Asennus ja käynnistys

```bash
node index.js
```

Ei riippuvuuksia — toimii suoraan Node.js:llä.

## API-endpointit

| Endpoint | Kuvaus |
|---|---|
| `GET /health` | Palvelimen tila ja uptime |
| `GET /decisions` | Viranomaispäätökset (RSS proxy) |
| `GET /meetings` | Kokousasiat (RSS proxy) |
| `GET /agendas` | Kokoukset (RSS proxy) |
| `GET /news/arctial` | Arctial-uutiset Supabasesta |
| `GET /news/kokkola` | Kokkola-uutiset Supabasesta |
| `GET /sync` | Käynnistä feed-synkronointi manuaalisesti |
| `GET /sync-news` | Käynnistä uutissynkronointi manuaalisesti |
| `GET /parse-pdfs` | Käynnistä PDF-parsinta manuaalisesti |

## Supabase-taulut

```sql
-- Päätökset ja kokousasiat
CREATE TABLE paatokset (
  id SERIAL PRIMARY KEY,
  ulkoinen_id TEXT UNIQUE,
  otsikko TEXT,
  kuvaus TEXT,
  julkaisija TEXT,
  linkki TEXT,
  julkaistu DATE,
  tyyppi TEXT,
  luotu TIMESTAMPTZ DEFAULT NOW()
);

-- Uutiset (Arctial + Kokkola)
CREATE TABLE uutiset (
  id SERIAL PRIMARY KEY,
  aihe TEXT,
  otsikko TEXT,
  url TEXT,
  kuvaus TEXT,
  julkaistu TEXT,
  luotu TIMESTAMPTZ DEFAULT NOW()
);

-- Talousdata PDF-parsinnasta
CREATE TABLE talousdata (
  id SERIAL PRIMARY KEY,
  kokous_id TEXT UNIQUE,
  kokous_pvm DATE,
  raportti_tyyppi TEXT,
  data JSONB,
  luotu TIMESTAMPTZ DEFAULT NOW()
);
```

## Synkronointiaikataulu

- **Feed-synkronointi**: 1 tunnin välein
- **Uutissynkronointi**: 1 kerran päivässä
- **PDF-parsinta**: Feed-synkronoinnin yhteydessä (2 viimeisintä KH-kokousta)
