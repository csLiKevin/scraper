# scraper

Scraper for cloud storage services.

# Instructions

Compile with `npm run build`.

Run with `npm start -- url YOUR_URL`.

# Supported Services

Set environment variables for the service you are scraping from.

## Dropbox

`DROPBOX_ACCESS_TOKEN`

Access token with `files.metadata.read` and `sharing.read` scopes.

## Google Drive

`GOOGLE_API_KEY`

## Imgur

`IMGUR_CLIENT_ID`

# Rate Limiting

Some services will prevent you from downloading files too quickly. Wait a few minutes and run the scraper again with the same arguments.
