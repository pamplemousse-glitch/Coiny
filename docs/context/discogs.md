# Discogs API Context

Source: https://api.discogs.com/ — live API endpoint responses + https://www.discogs.com/developers/

## Overview

Discogs is the world's largest vinyl/physical media marketplace and database. The API covers:
- Database: 19M+ releases, 10M+ artists, 2.2M+ labels
- Marketplace: buying/selling, price history, condition-based pricing
- Collection management: authenticated users can read/manage their personal collection
- Free to use; rate limits enforced by User-Agent header requirement

## Authentication

**Unauthenticated** (read-only public data):
- Include `User-Agent: AppName/1.0 +contact@example.com` header on every request
- Rate limit: 60 requests/minute (25 for unauthenticated)

**OAuth 1.0a** (required for user collection access):
1. `GET https://api.discogs.com/oauth/request_token` → `oauth_token`, `oauth_token_secret`
2. Redirect user to `https://www.discogs.com/oauth/authorize?oauth_token={token}`
3. `POST https://api.discogs.com/oauth/access_token` → permanent `oauth_token` + `oauth_token_secret`
4. Sign all subsequent requests with HMAC-SHA1 using the access token pair

No app approval process — self-serve OAuth app registration at https://www.discogs.com/settings/developers.

## Key Endpoints

### Database (no auth required)

```
GET /releases/{release_id}
```
Returns: `id`, `title`, `year`, `artists[]`, `labels[]`, `formats[]`, `genres[]`, `styles[]`, `community.have`, `community.want`

```
GET /database/search?q={query}&type=release&per_page=25&page=1
```
Params: `q` (text), `artist`, `release_title`, `barcode`, `type` (release|master|artist|label), `per_page` (max 100)
Returns: `pagination`, `results[]` with `id`, `title`, `year`, `format[]`, `label[]`, `genre[]`, `resource_url`, `cover_image`

```
GET /masters/{master_id}
```
Master release (canonical version) — links to all pressings.

### Marketplace (auth required for price suggestions)

```
GET /marketplace/stats/{release_id}
```
No auth required. Returns:
```json
{
  "num_for_sale": 116,
  "lowest_price": { "value": 0.68, "currency": "USD" },
  "blocked_from_sale": false
}
```

```
GET /marketplace/price_suggestions/{release_id}
```
Auth required. Returns condition-based pricing:
```json
{
  "Mint (M)": { "currency": "USD", "value": 15.00 },
  "Near Mint (NM or M-)": { "currency": "USD", "value": 12.50 },
  "Very Good Plus (VG+)": { "currency": "USD", "value": 8.00 },
  "Very Good (VG)": { "currency": "USD", "value": 5.00 },
  "Good Plus (G+)": { "currency": "USD", "value": 3.00 },
  "Good (G)": { "currency": "USD", "value": 2.00 },
  "Fair (F)": { "currency": "USD", "value": 1.00 },
  "Poor (P)": { "currency": "USD", "value": 0.50 }
}
```

### User Collection (OAuth required)

```
GET /users/{username}/collection/folders
```
Returns array of folders: `id`, `name`, `count`, `resource_url`
- Folder 0 = "All" (union of all folders)

```
GET /users/{username}/collection/folders/{folder_id}/releases?per_page=100&page=1&sort=added&sort_order=desc
```
Returns paginated collection:
```json
{
  "pagination": { "per_page": 100, "pages": 3, "page": 1, "items": 247 },
  "releases": [
    {
      "id": 12345,
      "instance_id": 67890,
      "date_added": "2024-01-15T10:30:00-07:00",
      "rating": 4,
      "basic_information": {
        "id": 249504,
        "title": "Kid A",
        "year": 2000,
        "resource_url": "https://api.discogs.com/releases/249504",
        "thumb": "https://i.discogs.com/...",
        "cover_image": "https://i.discogs.com/...",
        "formats": [{ "name": "Vinyl", "qty": "2", "descriptions": ["LP", "Album"] }],
        "labels": [{ "name": "Parlophone", "catno": "724352912513" }],
        "artists": [{ "name": "Radiohead" }],
        "genres": ["Rock"],
        "styles": ["Art Rock", "Experimental"]
      },
      "notes": [{ "field_id": 1, "value": "VG+" }]
    }
  ]
}
```

```
GET /users/{username}/identity
```
Returns `id`, `username`, `resource_url` — use to get username from OAuth token.

## Integration Strategy for Net Worth

For a user's vinyl collection valuation:
1. OAuth flow to get user's Discogs OAuth token pair
2. `GET /users/{username}/collection/folders/0/releases` — paginate through all records
3. For each release: `GET /marketplace/stats/{release_id}` → `lowest_price.value` as conservative valuation
4. (Optional, auth required) `GET /marketplace/price_suggestions/{release_id}` for condition-adjusted value
5. Sum across collection; store `lowest_price_usd` per record in DB

## Rate Limits

- 25 req/min unauthenticated, 60 req/min authenticated
- Include `User-Agent: Coiny/1.0 +support@coiny.app` on every request
- Discogs TOS requires attribution: "Data provided by Discogs"

## Base URL

```
https://api.discogs.com
```
