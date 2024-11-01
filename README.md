# What
- A little playground for tinkering with the X API.

## Quick Links
- [Twitter Dev Portal](https://developer.twitter.com/en/portal/dashboard)

## Next Up
- Consume the X Lists API
- See if this is the API that will allow us to figure out what account we want to comment against

## How to run this app
virtualenv -m venv venv
source ./venv/bin/activate
pip install -r requirements.txt
python3 server.py

## Testing this app
- Login against twitter user EvanHar51286434 in chrome
- Navigate to http://localhost:5000/playground to post a tweet
- 