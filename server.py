import base64
import hashlib
import os
import re
import requests
import random

from requests_oauthlib import OAuth2Session
from flask import Flask, request, redirect, session, render_template

class Config:
    SCHEDULER_API_ENABLED = True


app = Flask(__name__)
app.secret_key = os.urandom(50)

client_id = os.environ.get("CLIENT_ID")
client_secret = os.environ.get("CLIENT_SECRET")
auth_url = "https://twitter.com/i/oauth2/authorize"
token_url = "https://api.twitter.com/2/oauth2/token"
redirect_uri = os.environ.get("REDIRECT_URI")

print(f"redirect_uri: {redirect_uri}")

scopes = ["tweet.read", "users.read", "tweet.write", "offline.access"]

code_verifier = base64.urlsafe_b64encode(os.urandom(30)).decode("utf-8")
code_verifier = re.sub("[^a-zA-Z0-9]+", "", code_verifier)

code_challenge = hashlib.sha256(code_verifier.encode("utf-8")).digest()
code_challenge = base64.urlsafe_b64encode(code_challenge).decode("utf-8")
code_challenge = code_challenge.replace("=", "")


def make_token():
    return OAuth2Session(client_id, redirect_uri=redirect_uri, scope=scopes)

def post_tweet(payload, token):
    return requests.request(
        "POST",
        "https://api.twitter.com/2/tweets",
        json=payload,
        headers={
            "Authorization": "Bearer {}".format(token["access_token"]),
            "Content-Type": "application/json",
        },
    )
    
@app.route("/")
def hello():
    return render_template("index.html")


@app.route("/start")
def demo():
    global twitter
    twitter = make_token()
    authorization_url, state = twitter.authorization_url(
        auth_url, code_challenge=code_challenge, code_challenge_method="S256"
    )
    session["oauth_state"] = state
    return redirect(authorization_url)


@app.route("/oauth/callback", methods=["GET"])
def callback():
    code = request.args.get("code")
    token = twitter.fetch_token(
        token_url=token_url,
        client_secret=client_secret,
        code_verifier=code_verifier,
        code=code,
    )
    text = "Amor of {}.".format(random.randint(1, 1000000))
    payload = {"text": text}
    response = post_tweet(payload, token).json()
    print(response)

    posted = response["data"]["text"]
    return render_template("thank-you.html", value=posted)


if __name__ == "__main__":
  app.config.from_object(Config())
  app.run()