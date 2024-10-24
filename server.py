import logging
import base64
import hashlib
import os
import re
import requests
import random

from dotenv import load_dotenv
from requests_oauthlib import OAuth2Session
from flask import Flask, request, redirect, session, render_template

class Config:
    SCHEDULER_API_ENABLED = True

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
app.secret_key = int(os.environ.get("FLASK_SESSION_KEY")).to_bytes(2, 'big') # Secret key for session management

# OAuth2 credentials and endpoints
client_id = os.environ.get("CLIENT_ID")
client_secret = os.environ.get("CLIENT_SECRET")
auth_url = "https://twitter.com/i/oauth2/authorize"
token_url = "https://api.twitter.com/2/oauth2/token"
redirect_uri = os.environ.get("REDIRECT_URI")

# Set up logging
logging.basicConfig(level=logging.DEBUG)

# Define OAuth2 scopes and PKCE parameters
scopes = ["tweet.read", "users.read", "tweet.write", "offline.access"]

code_verifier = base64.urlsafe_b64encode(os.urandom(30)).decode("utf-8")
code_verifier = re.sub("[^a-zA-Z0-9]+", "", code_verifier)

code_challenge = hashlib.sha256(code_verifier.encode("utf-8")).digest()
code_challenge = base64.urlsafe_b64encode(code_challenge).decode("utf-8")
code_challenge = code_challenge.replace("=", "")

# Function to create an OAuth2Session
def make_token():
    return OAuth2Session(client_id, redirect_uri=redirect_uri, scope=scopes)

# Function to post a tweet (example usage)
def post_tweet(payload, token):
    return requests.post(
        "https://api.twitter.com/2/tweets",
        json=payload,
        headers={
            "Authorization": f"Bearer {token['access_token']}",
            "Content-Type": "application/json",
        },
    )
def get_user_id(token):
    return requests.get(
        "https://api.twitter.com/2/users/me",
        headers={
            "Authorization": f"Bearer {token['access_token']}",
            "Content-Type": "application/json",
        },
    )

# Route for the homepage
@app.route("/")
def homepage():
    # Check if the user has an active session
    if "oauth_token" in session:
        logging.debug("User is logged in :)")
        token = session["oauth_token"]

        response = get_user_id(token)
        data = response.json().get("data", {})
        user_id = data.get("id", "No id found")
        name = data.get("name", "No name found")
        username = data.get("username", "No username found")
        return render_template("homepage.html", user_id=user_id, name=name, username=username)  # Display homepage if session exists
    else:
        return render_template("index.html")  # Render index.html if no session

# Route to start the OAuth process
@app.route("/start")
def start():
    # Check if the user is already logged in
    if "oauth_token" in session:
        return redirect("/")  # Redirect to homepage if already logged in

    # Capture the intended destination URL
    redirect_url = request.args.get('redirect_url', '/')
    
    # Store the redirect URL in the session
    session['redirect_url'] = redirect_url
    
    global twitter
    twitter = make_token()
    authorization_url, state = twitter.authorization_url(
        auth_url, code_challenge=code_challenge, code_challenge_method="S256"
    )
    session["oauth_state"] = state
    return redirect(authorization_url)

# Route to handle OAuth callback
@app.route("/oauth/callback", methods=["GET"])
def callback():
    code = request.args.get("code")
    token = twitter.fetch_token(
        token_url=token_url,
        client_secret=client_secret,
        code_verifier=code_verifier,
        code=code,
    )
    
    # Save the token in the session
    session["oauth_token"] = token
    
    # Retrieve the URL to redirect to from the session
    redirect_url = session.get('redirect_url', '/')
    
    # Optionally clear the redirect_url from the session
    session.pop('redirect_url', None)
    
    return redirect(redirect_url)

# Route for a demo or play area
@app.route("/playground")
def playground():
    logging.debug("hello ;)")
    # Example usage of the token
    if "oauth_token" in session:
        token = session["oauth_token"]
        text = f"We love random numbers... {random.randint(1, 1000000)}."
        payload = {"text": text}
        response = post_tweet(payload, token).json()
        posted = response.get("data", {}).get("text", "No text found")
        return render_template("thank-you.html", value=posted)
    else:
        return redirect("/")

if __name__ == "__main__":
    app.config.from_object(Config())
    app.run(debug=True)  # Run Flask app in debug mode
