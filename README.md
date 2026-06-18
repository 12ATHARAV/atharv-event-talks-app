# BigQuery Release Notes Tracker

A sleek, modern web application built using **Python (Flask)** and **vanilla HTML5, CSS3, and JavaScript** that fetches, parses, and displays the latest Google Cloud BigQuery release notes. The app provides a beautiful user interface with a real-time feed, category filtering, search, and a built-in Twitter (X) composer to easily tweet about specific updates.

## 🚀 Features

- **Real-Time Parser**: Automatically parses the official Google Cloud BigQuery RSS feed (`https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`) and extracts individual release items.
- **Smart Caching**: Implements a 5-minute memory cache to prevent rate-limiting and guarantee fast load times.
- **Dynamic & Responsive UI**:
  - **Premium Dark Mode**: Built with dark-mode-first aesthetics, featuring smooth card hover animations, glowing accent details, and floating background blobs.
  - **Live Search & Filter**: Filter by categories like *Features*, *Issues*, *Changes*, and *Deprecations* or search through the updates instantaneously.
  - **Interactive Stats Panel**: Clickable counters for various update types which act as filters.
  - **Interactive Tweet Composer**: Includes an integrated modal to preview and customize tweets using 3 style templates (*Short & Sweet*, *Professional*, *Hype/Tech*) with automatic character limit validation (handling link wrapping of 23 characters).
  - **One-click Copy & Post**: Easily copy the tweet text to your clipboard or open a new window pre-populated via Twitter Web Intent.

## 🛠️ Tech Stack

- **Backend**: Python 3, Flask, BeautifulSoup4, Feedparser, Requests
- **Frontend**: HTML5, CSS3 (Vanilla), JavaScript (Vanilla), FontAwesome (Icons)

## 📦 Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/12ATHARAV/atharv-event-talks-app.git
   cd atharv-event-talks-app
   ```

2. **Set up a Virtual Environment & Install Dependencies:**
   ```bash
   # Create a virtual environment
   python -m venv .venv
   
   # Activate virtual environment (Windows)
   .venv\Scripts\activate
   
   # Activate virtual environment (macOS/Linux)
   source .venv/bin/activate

   # Install requirements
   pip install -r requirements.txt
   ```

3. **Run the Application:**
   ```bash
   python app.py
   ```
   Open [http://127.0.0.1:5000](http://127.0.0.1:5000) in your browser.


