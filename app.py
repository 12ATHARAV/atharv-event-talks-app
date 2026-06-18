import uuid
import requests
import feedparser
from bs4 import BeautifulSoup
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache
cache = {
    "data": None,
    "last_updated": 0
}
CACHE_TIMEOUT = 300  # 5 minutes

def parse_release_notes():
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    # Fetch feed content
    response = requests.get(FEED_URL, headers=headers, timeout=15)
    response.raise_for_status()
    
    # Parse feed
    feed = feedparser.parse(response.text)
    
    parsed_items = []
    
    for entry in feed.entries:
        # The title of the entry in BigQuery feed is usually the date (e.g. "June 15, 2026")
        date_str = entry.get("title", "Unknown Date")
        link = entry.get("link", "")
        
        # Get HTML content
        content_html = ""
        if "content" in entry and len(entry.content) > 0:
            content_html = entry.content[0].value
        else:
            content_html = entry.get("summary", "")
            
        if not content_html:
            continue
            
        soup = BeautifulSoup(content_html, "html.parser")
        
        # We need to split the content by <h3> elements
        # A typical entry has: <h3>Feature</h3> <p>...</p> <h3>Issue</h3> <p>...</p>
        current_type = None
        current_elements = []
        
        for child in soup.contents:
            if child.name == 'h3':
                # Save previous item if we have one
                if current_type and current_elements:
                    item_html = "".join(str(c) for c in current_elements)
                    item_text = "".join(c.get_text() if hasattr(c, 'get_text') else str(c) for c in current_elements).strip()
                    parsed_items.append({
                        "id": str(uuid.uuid4()),
                        "date": date_str,
                        "type": current_type,
                        "html": item_html,
                        "text": item_text,
                        "link": link
                    })
                current_type = child.get_text().strip()
                current_elements = []
            elif child.name is not None or (isinstance(child, str) and child.strip()):
                current_elements.append(child)
                
        # Save the last item
        if current_type and current_elements:
            item_html = "".join(str(c) for c in current_elements)
            item_text = "".join(c.get_text() if hasattr(c, 'get_text') else str(c) for c in current_elements).strip()
            parsed_items.append({
                "id": str(uuid.uuid4()),
                "date": date_str,
                "type": current_type,
                "html": item_html,
                "text": item_text,
                "link": link
            })
            
    return parsed_items

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/releases")
def get_releases():
    force_refresh = request.args.get("refresh", "false").lower() == "true"
    now = time.time()
    
    if force_refresh or not cache["data"] or (now - cache["last_updated"] > CACHE_TIMEOUT):
        try:
            cache["data"] = parse_release_notes()
            cache["last_updated"] = now
        except Exception as e:
            return jsonify({
                "success": False,
                "error": str(e)
            }), 500
            
    return jsonify({
        "success": True,
        "releases": cache["data"],
        "last_updated": cache["last_updated"]
    })

if __name__ == "__main__":
    app.run(debug=True, port=5000)
