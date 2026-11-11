# Offline Book Library

An offline-first Book Library mobile application built using **React Native, Expo, and TypeScript**, powered by the [Gutendex API](https://gutendex.com/books/).

The application allows users to browse popular books, filter books by language and topic, view detailed book information, and save books locally for offline access.

## Features

### 1. Browse Books
- Fetch popular books from the Gutendex API.
- Display book covers, titles, authors, and download counts.
- Filter books by language:
  - All
  - English
  - French
  - Finnish
  - German
- Filter books by topic:
  - All
  - Fiction
  - Children
  - Science Fiction
  - Poetry
- Support pagination for loading additional books.

### 2. Book Details
- Display book title and author information.
- Display available languages.
- Display subjects and bookshelves.
- Show download count and cover image.
- Display available download formats.
- Save books for offline access.
- Remove previously saved books.

### 3. Offline-First Architecture
- Display cached Browse results immediately when the application launches.
- Refresh book data from the API in the background.
- Indicate whether displayed data is cached or freshly fetched.
- Display an offline banner when there is no internet connection.
- Keep saved books accessible without an internet connection.
- Show a meaningful error when opening a non-saved book while offline.

### 4. Local Database
Uses Expo SQLite to persist book metadata locally.

Two main data collections:

- `browse_cache`: Stores lightweight cached Browse results.
- `saved_books`: Stores metadata of books explicitly saved by the user.

Only the fields required to render the application are persisted to avoid storing unnecessarily large API responses.

## Tech Stack

- React Native
- Expo
- TypeScript
- React Navigation
- Expo SQLite
- NetInfo
- Gutendex REST API
- Skia
- Vector-Icons

## API Integration

Base URL:

https://gutendex.com/books/

Supported query parameters:

| Parameter | Description |
|---|---|
| `languages` | Filter by language |
| `topic` | Filter by subject or bookshelf |
| `sort` | Sort by popularity or direction |
| `ids` | Fetch specific Gutenberg book IDs |
| `page` | Fetch paginated results |

Example:

```text
https://gutendex.com/books/?languages=en&topic=fiction&page=1
```

## Application Architecture

The application follows a cached-first data loading strategy.

1. Initialize the SQLite database.
2. Read cached Browse results from SQLite.
3. Display cached data immediately if available.
4. Check internet connectivity.
5. Fetch updated results from Gutendex when online.
6. Update the local Browse cache.
7. Refresh the UI with the latest API results.
8. Save selected book metadata to SQLite when the user chooses Save for offline.

## Navigation

The application contains two primary screens:

- **Browse Screen:** Book discovery, language filters, topic filters, and pagination.
- **Book Details Screen:** Detailed book information and offline save management.

## Installation and Setup

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/gutendex-offline-book-library.git

cd gutendex-offline-book-library
```

Install dependencies:

```bash
npm install
```

Start the Expo development server:

```bash
npx expo start
```

Run on Android:

```bash
npx expo run:android
```

## Offline Behaviour

| Scenario | Expected Behaviour |
|---|---|
| App launch with cache | Display cached books immediately |
| App launch with internet | Refresh data in background |
| App launch without internet | Display cached books with offline banner |
| Open saved book offline | Load details from SQLite |
| Open non-saved book offline | Display meaningful offline error |
| Save a book online | Persist metadata in SQLite |
| Remove saved book | Delete its local metadata |

## Project Goals

This project demonstrates:

- REST API integration.
- Offline-first application architecture.
- SQLite database integration.
- Data caching and synchronization.
- Network connectivity handling.
- React Navigation.
- TypeScript interfaces and reusable components.
- Efficient local data persistence.

## API Credits

Book data is provided by [Project Gutenberg](https://www.gutenberg.org/) through the [Gutendex API](https://gutendex.com/).

## License

This project is available under the MIT License.
